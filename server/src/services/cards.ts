import { Hono } from "hono";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import type { AppContext } from "../core/hono-types";
import { profileAsync } from "../core/server-timing";
import { cardKeys, users } from "../db/schema";
import { adminOnly, userOnly } from "../core/route-boundaries";
import { BadRequestError, NotFoundError } from "../errors";

function cardExpiresAt(card: { expiryHours: number; activatedAt: Date | string | null }): number | null {
    if (card.expiryHours <= 0 || !card.activatedAt) return null;
    return new Date(card.activatedAt).getTime() + card.expiryHours * 60 * 60 * 1000;
}

// The countdown only starts once the card is activated; unactivated cards never expire.
function isCardExpired(card: { status: string; expiryHours: number; activatedAt: Date | string | null }): boolean {
    if (card.status !== "active") return false;
    const expiresAt = cardExpiresAt(card);
    return expiresAt !== null && Date.now() > expiresAt;
}

function generateCode(prefix = "", length = 16): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomPart = "";
    for (let i = 0; i < length; i++) {
        if (i > 0 && i % 4 === 0) {
            randomPart += "-";
        }
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return prefix ? `${prefix}${randomPart}` : randomPart;
}

export function CardService(): Hono {
    const app = new Hono();

    // GET /cards/list - Admin only
    app.get("/list", adminOnly(async (c: AppContext) => {
        const db = c.get("db");
        const rows = await profileAsync(c, "cards_list_lookup", () =>
            db.select().from(cardKeys).orderBy(desc(cardKeys.id))
        );

        // Persist expired cards: an active card past its activation window becomes 'expired'.
        const expiredIds = rows.filter(isCardExpired).map(r => r.id);
        if (expiredIds.length > 0) {
            await profileAsync(c, "cards_list_expire_sweep", () =>
                db.update(cardKeys)
                    .set({ status: "expired", updatedAt: new Date() })
                    .where(inArray(cardKeys.id, expiredIds))
            );
        }

        // Resolve creator / activator usernames in one pass.
        const userIds = [...new Set(rows.flatMap(r => [r.createdBy, r.activatedBy]).filter((v): v is number => v !== null))];
        const usernameMap: Map<number, string> = new Map();
        if (userIds.length > 0) {
            const userRows = await db.select({ id: users.id, username: users.username })
                .from(users)
                .where(inArray(users.id, userIds));
            for (const u of userRows) usernameMap.set(u.id, u.username);
        }

        const result = rows.map(row => ({
            id: row.id,
            code: row.code,
            status: isCardExpired(row) ? "expired" : row.status,
            note: row.note,
            expiryHours: row.expiryHours,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            createdBy: row.createdBy,
            activatedBy: row.activatedBy,
            activatedAt: row.activatedAt,
            createdByUsername: row.createdBy !== null ? usernameMap.get(row.createdBy) ?? null : null,
            activatedByUsername: row.activatedBy !== null ? usernameMap.get(row.activatedBy) ?? null : null,
        }));

        return c.json(result);
    }, { format: "json" }));

    // POST /cards/generate - Admin only
    app.post("/generate", adminOnly(async (c: AppContext) => {
        const db = c.get("db");
        const uid = c.get("uid");
        const body = await profileAsync(c, "cards_generate_parse", () => c.req.json());
        const { count = 1, prefix = "", note = "", expiryHours = 0 } = body as {
                        count?: number;
                        prefix?: string;
                        note?: string;
                        expiryHours?: number;
                    };

        const numToGenerate = Math.min(Math.max(1, Number(count) || 1), 100);
        const createdCards = [];

        for (let i = 0; i < numToGenerate; i++) {
            let code = generateCode(prefix);
            let attempts = 0;
            while (attempts < 5) {
                const existing = await db.query.cardKeys.findFirst({
                    where: eq(cardKeys.code, code)
                });
                if (!existing) break;
                code = generateCode(prefix);
                attempts++;
            }

            const inserted = await db.insert(cardKeys).values({
                code,
                status: "active",
                note,
                expiryHours: expiryHours,
                createdBy: uid,
            }).returning();

            if (inserted && inserted.length > 0) {
                createdCards.push(inserted[0]);
            }
        }

        return c.json({ success: true, cards: createdCards });
    }, { format: "json" }));

    // POST /cards/verify - Admin only: verify a card key code
    app.post("/verify", adminOnly(async (c: AppContext) => {
        const db = c.get("db");
        const body = await profileAsync(c, "cards_verify_parse", () => c.req.json());
        const { code } = body as { code: string };

        if (!code || !code.trim()) {
            throw new BadRequestError("Card key code is required");
        }

        const trimmedCode = code.trim();
        const card = await profileAsync(c, "cards_verify_lookup", () =>
            db.query.cardKeys.findFirst({ where: eq(cardKeys.code, trimmedCode) })
        );

        if (!card) {
            return c.json({
                valid: false,
                status: null,
                code: trimmedCode,
                message: "卡密不存在",
                activatedAt: null,
                expiresAt: null,
            });
        }

        if (card.status === "frozen") {
            return c.json({
                valid: false,
                status: card.status,
                code: card.code,
                message: "该卡密已被冻结",
                activatedAt: card.activatedAt,
                expiresAt: null,
            });
        }

        if (card.status === "invalid") {
            return c.json({
                valid: false,
                status: card.status,
                code: card.code,
                message: "该卡密已失效",
                activatedAt: card.activatedAt,
                expiresAt: null,
            });
        }

        const activatedAtMs = card.activatedAt ? new Date(card.activatedAt).getTime() : null;
        const expiresAtMs = cardExpiresAt(card);

        if (card.status === "expired" || isCardExpired(card)) {
            // Persist the transition so the admin list shows 'expired' immediately.
            if (card.status !== "expired") {
                await profileAsync(c, "cards_verify_expire", () =>
                    db.update(cardKeys)
                        .set({ status: "expired", updatedAt: new Date() })
                        .where(eq(cardKeys.id, card.id))
                );
            }
            return c.json({
                valid: false,
                status: "expired",
                code: card.code,
                message: `该卡密已过期（有效期 ${card.expiryHours} 小时，自激活时起算）`,
                activatedAt: card.activatedAt,
                expiresAt: expiresAtMs !== null ? new Date(expiresAtMs) : null,
            });
        }

        // Countdown only runs once the card has been activated.
        let lifeInfo = "（永久有效）";
        if (card.expiryHours > 0) {
            lifeInfo = activatedAtMs === null
                ? `（有效期 ${card.expiryHours} 小时，尚未激活，激活后开始计时）`
                : `（剩余 ${Math.max(0, Math.round((expiresAtMs! - Date.now()) / 3600000))} 小时）`;
        }

        return c.json({
            valid: true,
            status: card.status,
            code: card.code,
            message: `卡密有效${lifeInfo}${card.activatedBy ? `，已由用户 #${card.activatedBy} 激活` : "，未激活"}`,
            activatedAt: card.activatedAt,
            expiresAt: expiresAtMs !== null ? new Date(expiresAtMs) : null,
        });
    }, { format: "json" }));

    // POST /cards/activate - Any signed-in user: claim a card, one time only
    app.post("/activate", userOnly(async (c: AppContext, uid: number) => {
        const db = c.get("db");
        const body = await profileAsync(c, "cards_activate_parse", () => c.req.json());
        const { code } = body as { code?: string };

        if (!code || !code.trim()) {
            throw new BadRequestError("Card key code is required");
        }

        const trimmedCode = code.trim();
        const card = await profileAsync(c, "cards_activate_lookup", () =>
            db.query.cardKeys.findFirst({ where: eq(cardKeys.code, trimmedCode) })
        );

        if (!card) {
            return c.json({ success: false, message: "卡密不存在" }, 400);
        }
        if (card.status === "frozen") {
            return c.json({ success: false, message: "该卡密已被冻结" }, 400);
        }
        if (card.status === "invalid") {
            return c.json({ success: false, message: "该卡密已失效" }, 400);
        }
        if (card.status === "expired" || isCardExpired(card)) {
            return c.json({ success: false, message: "该卡密已过期" }, 400);
        }

        // One card can only ever be activated once. The guard condition
        // (activated_by IS NULL) makes the claim atomic under concurrent requests.
        const activatedAt = new Date();
        const updated = await profileAsync(c, "cards_activate_claim", () =>
            db.update(cardKeys)
                .set({ activatedBy: uid, activatedAt, updatedAt: activatedAt })
                .where(and(eq(cardKeys.id, card.id), isNull(cardKeys.activatedBy)))
                .returning()
        );

        if (updated.length === 0) {
            return c.json({ success: false, message: "该卡密已被使用，不能重复激活" }, 409);
        }

        return c.json({
            success: true,
            card: updated[0],
            message: card.expiryHours > 0
                ? `激活成功，有效期 ${card.expiryHours} 小时，自激活时起算`
                : "激活成功，永久有效",
        });
    }, { format: "json" }));

    // PUT /cards/:id/status - Admin only
    app.put("/:id/status", adminOnly(async (c: AppContext) => {
        const db = c.get("db");
        const cardId = parseInt(c.req.param("id"), 10);
        const body = await profileAsync(c, "cards_status_parse", () => c.req.json());
        const { status } = body as { status: string };

        if (isNaN(cardId)) {
            throw new BadRequestError("Invalid card ID");
        }

        if (![ "active", "frozen", "invalid" ].includes(status)) {
            throw new BadRequestError("Invalid status value. Must be 'active', 'frozen', or 'invalid'");
        }

        const card = await profileAsync(c, "cards_status_lookup", () =>
            db.query.cardKeys.findFirst({ where: eq(cardKeys.id, cardId) })
        );

        if (!card) {
            throw new NotFoundError("Card not found");
        }

        await profileAsync(c, "cards_status_update", () =>
            db.update(cardKeys).set({
                status,
                updatedAt: new Date(),
            }).where(eq(cardKeys.id, cardId))
        );

        return c.json({ success: true });
    }, { format: "json" }));

    // DELETE /cards/:id - Admin only
    app.delete("/:id", adminOnly(async (c: AppContext) => {
        const db = c.get("db");
        const cardId = parseInt(c.req.param("id"), 10);

        if (isNaN(cardId)) {
            throw new BadRequestError("Invalid card ID");
        }

        const card = await profileAsync(c, "cards_delete_lookup", () =>
            db.query.cardKeys.findFirst({ where: eq(cardKeys.id, cardId) })
        );

        if (!card) {
            throw new NotFoundError("Card not found");
        }

        await profileAsync(c, "cards_delete", () =>
            db.delete(cardKeys).where(eq(cardKeys.id, cardId))
        );

        return c.json({ success: true });
    }, { format: "json" }));

    return app;
}
