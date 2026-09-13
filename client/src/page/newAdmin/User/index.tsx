import { Helmet } from 'react-helmet'
import { useState, useEffect, useCallback } from 'react'
import { Card, Space, Table, Avatar, Tag, Button, Tooltip, Popconfirm, message, Tabs, Input, InputNumber, Alert, Modal, Form } from 'antd'
import { UserOutlined, SafetyCertificateOutlined, GithubOutlined, LockOutlined, UnlockOutlined, DeleteOutlined, PlusOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { client } from '../../../app/runtime'
import { AntdAdminLayout } from '../../../components/ui/admin-layout'
import { formatDateTime } from '../../../utils/format-date'
import type { UserAdminInfo, CardKeyInfo, GenerateCardKeysRequest, CardKeyStatus, VerifyCardKeyResponse, ActivateCardKeyResponse } from '@rin/api'
import { UserStatus } from '@rin/api'

export function UserAdminPage() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserAdminInfo[]>([])
  const [cards, setCards] = useState<(CardKeyInfo & { createdByUsername?: string | null; activatedByUsername?: string | null })[]>([])
  const [activeTab, setActiveTab] = useState('users')
  const [generating, setGenerating] = useState(false)
  const [generateCount, setGenerateCount] = useState(10)
  const [generatePrefix, setGeneratePrefix] = useState('')
  const [generateNote, setGenerateNote] = useState('')
  const [generateExpiryHours, setGenerateExpiryHours] = useState(0)
  // Verification and activation share one code field — the tab shows the
  // card state first, then lets you claim it without re-typing.
  const [cardCode, setCardCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<VerifyCardKeyResponse | null>(null)
  const [modalVisible, setModalVisible] = useState(false)
  const [activating, setActivating] = useState(false)
  const [activateResult, setActivateResult] = useState<ActivateCardKeyResponse | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client.user.list()
      if (!error && data) {
        setUsers(data)
      }
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCards = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await client.card.list()
      if (!error && data) {
        setCards(data)
      }
    } catch (err) {
      console.error('Failed to fetch card keys:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchCards()
  }, [fetchUsers, fetchCards])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const body: GenerateCardKeysRequest = {
        count: generateCount,
        prefix: generatePrefix,
        note: generateNote,
        expiryHours: generateExpiryHours
      }
      const { data, error } = await client.card.generate(body)
      if (!error && data) {
        message.success(`已生成 ${data.cards.length} 个卡密`)
        setModalVisible(false)
        setGenerateCount(10)
        setGeneratePrefix('')
        setGenerateNote('')
        setGenerateExpiryHours(0)
        // Re-read the list so 创建人 and the resolved usernames render correctly.
        await fetchCards()
      } else {
        message.error(error?.value || '生成卡密失败')
      }
    } catch (err) {
      message.error('Failed to generate card keys')
    } finally {
      setGenerating(false)
    }
  }

  const handleVerify = async () => {
    if (!cardCode.trim()) {
      message.warning('请输入卡密')
      return
    }
    setVerifying(true)
    setVerifyResult(null)
    setActivateResult(null)
    try {
      const { data, error } = await client.card.verify({ code: cardCode.trim() })
      if (!error && data) {
        setVerifyResult(data)
      } else {
        message.error(error?.value || '验证失败')
      }
    } catch {
      message.error('验证失败')
    } finally {
      setVerifying(false)
    }
  }

  const handleUpdateCardStatus = async (id: number, status: CardKeyStatus) => {
    try {
      const { error } = await client.card.updateStatus(id, { status })
      if (!error) {
        setCards(prev => prev.map(card =>
          card.id === id ? { ...card, status } : card
        ))
        message.success(`Card status updated to ${status}`)
      }
    } catch {
      message.error('Failed to update card status')
    }
  }

  const handleDeleteCard = async (id: number) => {
    try {
      const { error } = await client.card.delete(id)
      if (!error) {
        setCards(prev => prev.filter(card => card.id !== id))
        message.success('Card deleted')
      }
    } catch {
      message.error('Failed to delete card')
    }
  }

  const handleActivate = async () => {
    if (!cardCode.trim()) {
      message.warning('请输入卡密')
      return
    }
    setActivating(true)
    setActivateResult(null)
    try {
      const { data, error } = await client.card.activate({ code: cardCode.trim() })
      if (!error && data) {
        setActivateResult(data)
        // The card state just changed, so drop the stale verify panel and
        // refresh the list so 创建人/激活人 and the new expiry reflect it.
        setVerifyResult(null)
        fetchCards()
      } else {
        message.error(error?.value || '激活失败')
      }
    } catch {
      message.error('激活失败')
    } finally {
      setActivating(false)
    }
  }

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a: UserAdminInfo, b: UserAdminInfo) => a.id - b.id,
    },
    {
      title: '用户',
      key: 'user',
      render: (_: any, record: UserAdminInfo) => (
        <Space>
          <Avatar src={record.avatar} icon={<UserOutlined />} />
          <span className="font-medium text-slate-900">{record.username}</span>
        </Space>
      ),
    },
    {
      title: 'OpenID / 来源',
      dataIndex: 'openid',
      key: 'openid',
      render: (openid: string) => (
        <Space size="small">
          <GithubOutlined className="text-slate-400" />
          <code className="text-xs bg-slate-100 px-1 py-0.5 rounded text-slate-600">{openid}</code>
        </Space>
      ),
    },
    {
      title: '权限',
      dataIndex: 'permission',
      key: 'permission',
      render: (permission: number | null) => (
        permission === 1 ? (
          <Tag color="blue" icon={<SafetyCertificateOutlined />}>管理员</Tag>
        ) : (
          <Tag color="default">普通用户</Tag>
        )
      ),
    },
    {
      title: '状态',
      dataIndex: 'frozen',
      key: 'frozen',
      render: (frozen: number) => (
        frozen === UserStatus.Frozen ? (
          <Tag color="red" icon={<LockOutlined />}>已冻结</Tag>
        ) : (
          <Tag color="green" icon={<UnlockOutlined />}>正常</Tag>
        )
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <Tooltip title={date}>
          <span className="text-slate-500">{formatDateTime(date)}</span>
        </Tooltip>
      ),
      sorter: (a: UserAdminInfo, b: UserAdminInfo) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '最后更新',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => (
        <span className="text-slate-400 text-xs">{formatDateTime(date)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: UserAdminInfo) => (
        <Space>
          <Popconfirm
            title={record.frozen === UserStatus.Frozen ? '确认解冻此用户？' : '确认冻结此用户？'}
            description={record.frozen === UserStatus.Frozen ? '解冻后用户将可以正常登录。' : '冻结后用户将无法登录，直到管理员解冻。'}
            onConfirm={async () => {
              try {
                const { error } = await client.user.updateFreeze(record.id, { frozen: record.frozen === UserStatus.Frozen ? UserStatus.Normal : UserStatus.Frozen })
                if (!error) {
                  fetchUsers()
                  message.success(record.frozen === UserStatus.Frozen ? '已解冻用户' : '已冻结用户')
                } else {
                  message.error('操作失败')
                }
              } catch {
                message.error('操作失败')
              }
            }}
            okText={record.frozen === UserStatus.Frozen ? '解冻' : '冻结'}
            cancelText="取消"
            okButtonProps={{ danger: record.frozen !== UserStatus.Frozen }}
          >
            <Button
              size="small"
              type="primary"
              icon={record.frozen === UserStatus.Frozen ? <UnlockOutlined /> : <LockOutlined />}
            >
              {record.frozen === UserStatus.Frozen ? '解冻' : '冻结'}
            </Button>
          </Popconfirm>
          {record.permission !== 1 && (
            <Popconfirm
              title="确认删除此用户？"
              description="删除后用户将被永久删除，此操作不可逆。"
              onConfirm={async () => {
                try {
                  const { error } = await client.user.deleteUser(record.id)
                  if (!error) {
                    fetchUsers()
                    message.success('已删除用户')
                  } else {
                    message.error('操作失败')
                  }
                } catch {
                  message.error('操作失败')
                }
              }}
              okText="删除"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" icon={<DeleteOutlined />} danger>删除</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  const cardColumns = [
    {
      title: '卡密编号',
      dataIndex: 'code',
      key: 'code',
      render: (code: string) => (
        <code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono">{code}</code>
      ),
    },
    {
      title: '有效期(小时)',
      dataIndex: 'expiryHours',
      key: 'expiryHours',
      render: (expiryHours: number) => (
        <span className="text-slate-700">{expiryHours === 0 ? '永久有效' : `${expiryHours} 小时`}</span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: CardKeyStatus) => {
        const map: Record<CardKeyStatus, { color: string; text: string; icon: React.ReactNode }> = {
          active: { color: 'green', text: '有效', icon: <UnlockOutlined /> },
          frozen: { color: 'orange', text: '冻结', icon: <LockOutlined /> },
          invalid: { color: 'red', text: '无效', icon: <DeleteOutlined /> },
          expired: { color: 'default', text: '已过期', icon: <ClockCircleOutlined /> }
        }
        const { color, text, icon } = map[status]
        return <Tag color={color} icon={icon}>{text}</Tag>
      },
    },
    {
      title: '创建人',
      key: 'createdBy',
      render: (_: any, record: CardKeyInfo & { createdByUsername?: string | null }) => (
        record.createdByUsername ? (
          <Space size="small">
            <UserOutlined className="text-slate-400" />
            <span className="text-slate-700 text-sm">{record.createdByUsername}</span>
          </Space>
        ) : (
          <em className="text-slate-400 text-xs">未知</em>
        )
      ),
    },
    {
      title: '激活人',
      key: 'activatedBy',
      render: (_: any, record: CardKeyInfo & { activatedByUsername?: string | null }) => (
        record.activatedByUsername ? (
          <Space size="small">
            <UserOutlined className="text-slate-400" />
            <span className="text-slate-700 text-sm">{record.activatedByUsername}</span>
          </Space>
        ) : (
          <em className="text-slate-400 text-xs">未激活</em>
        )
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      render: (note: string) => note || <em>无</em>,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => (
        <span className="text-slate-500 text-xs">{formatDateTime(date)}</span>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: CardKeyInfo) => {
        // Expired cards are in a terminal state — no actions available.
        if (record.status === 'expired') {
          return <em className="text-slate-400 text-xs">已过期，无可用操作</em>
        }
        return (
          <Space>
            <Popconfirm
              title={record.status === 'active' ? '确认冻结此卡密？' : record.status === 'frozen' ? '确认解冻此卡密？' : '确认删除此卡密？'}
              description={record.status === 'active' ? '冻结后此卡密将无法使用。' : record.status === 'frozen' ? '解冻后此卡密将恢复使用。' : '删除后此卡密将永久移除，此操作不可逆。'}
              onConfirm={async () => {
                if (record.status === 'invalid') {
                  await handleDeleteCard(record.id)
                } else {
                  const newStatus = record.status === 'active' ? 'frozen' : 'active'
                  await handleUpdateCardStatus(record.id, newStatus as CardKeyStatus)
                }
              }}
              okText={record.status === 'active' ? '冻结' : record.status === 'frozen' ? '解冻' : '删除'}
              cancelText="取消"
              okButtonProps={{ danger: record.status === 'invalid' }}
            >
              <Button
                size="small"
                type="primary"
                danger={record.status === 'invalid'}
                icon={record.status === 'active' ? <LockOutlined /> : record.status === 'frozen' ? <UnlockOutlined /> : <DeleteOutlined />}
              >
                {record.status === 'active' ? '冻结' : record.status === 'frozen' ? '解冻' : '删除'}
              </Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <AntdAdminLayout>
      <Helmet>
        <title>用户管理 - 管理后台</title>
      </Helmet>
      <Card title="用户管理" style={{ marginBottom: 24 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'users',
              label: '用户列表',
              children: (
                <Table
                  dataSource={users}
                  columns={columns}
                  loading={loading}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              )
            },
            {
              key: 'cards',
              label: '卡密管理',
              children: (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setModalVisible(true)}
                    >
                      创建卡密
                    </Button>
                  </div>
                  <Table
                    dataSource={cards}
                    columns={cardColumns}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                  />
                </div>
              )
            },
            {
              key: 'card',
              label: '卡密验证/激活',
              children: (
                <div style={{ maxWidth: 600 }}>
                  <h3 style={{ marginBottom: 16 }}>卡密验证 / 激活</h3>
                  <p style={{ color: '#888', marginBottom: 16 }}>
                    输入卡密编码后先验证其状态；确认可用再激活（每张卡密仅可激活一次）。
                  </p>
                  <Space.Compact style={{ width: '100%', marginBottom: 24 }}>
                    <Input
                      placeholder="请输入卡密编码"
                      value={cardCode}
                      onChange={(e) => {
                        setCardCode(e.target.value)
                        setVerifyResult(null)
                        setActivateResult(null)
                      }}
                      onPressEnter={handleVerify}
                      prefix={<SearchOutlined />}
                      size="large"
                    />
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleVerify}
                      loading={verifying}
                    >
                      验证
                    </Button>
                    <Button
                      size="large"
                      onClick={handleActivate}
                      loading={activating}
                      // A card can only be claimed once, so there is nothing to
                      // activate until a verify confirms it is valid and unclaimed.
                      disabled={!verifyResult?.valid || !!verifyResult.activatedAt}
                    >
                      激活
                    </Button>
                  </Space.Compact>
                  {verifyResult && (
                    <Alert
                      style={{ marginBottom: activateResult ? 16 : 0 }}
                      type={verifyResult.valid ? 'success' : 'error'}
                      showIcon
                      message={verifyResult.valid ? '卡密有效' : '卡密无效'}
                      description={
                        <div>
                          <p style={{ margin: 0, marginBottom: 4 }}>
                            <strong>状态：</strong>
                            {verifyResult.status === 'active' ? '有效' :
                             verifyResult.status === 'frozen' ? '冻结' :
                             verifyResult.status === 'expired' ? '已过期' :
                             verifyResult.status === 'invalid' ? '失效' : '不存在'}
                          </p>
                          <p style={{ margin: 0 }}>
                            <strong>详情：</strong>{verifyResult.message}
                          </p>
                          <p style={{ margin: 0, marginTop: 4 }}>
                            <strong>激活时间：</strong>
                            {verifyResult.activatedAt ? new Date(verifyResult.activatedAt).toLocaleString() : '未激活'}
                          </p>
                          {verifyResult.expiresAt && (
                            <p style={{ margin: 0, marginTop: 4 }}>
                              <strong>过期时间：</strong>{new Date(verifyResult.expiresAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      }
                    />
                  )}
                  {activateResult && (
                    <Alert
                      type={activateResult.success ? 'success' : 'error'}
                      showIcon
                      message={activateResult.success ? '激活成功' : '激活失败'}
                      description={
                        <div>
                          <p style={{ margin: 0, marginBottom: 4 }}>{activateResult.message}</p>
                          {activateResult.card && (
                            <div style={{ marginTop: 8 }}>
                              <strong>卡密信息：</strong>
                              <div>
                                <p style={{ margin: 0 }}>代码：{activateResult.card.code}</p>
                                <p style={{ margin: 0 }}>状态：{activateResult.card.status === 'active' ? '有效' : activateResult.card.status === 'frozen' ? '冻结' : activateResult.card.status === 'invalid' ? '失效' : '已过期'}</p>
                                <p style={{ margin: 0 }}>激活时间：{activateResult.card.activatedAt ? new Date(activateResult.card.activatedAt).toLocaleString() : '未激活'}</p>
                                <p style={{ margin: 0 }}>有效期：{activateResult.card.expiryHours === 0 ? '永久' : `${activateResult.card.expiryHours} 小时，过期时间 ${activateResult.card.activatedAt ? new Date(new Date(activateResult.card.activatedAt).getTime() + activateResult.card.expiryHours * 3600000).toLocaleString() : '—'}`}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                  )}
                </div>
              )
            }
          ]}
        />
      </Card>
      <Modal
        title="创建卡密"
        open={modalVisible}
        onOk={handleGenerate}
        onCancel={() => setModalVisible(false)}
        okText={generating ? '生成中...' : '生成'}
        cancelText="取消"
        confirmLoading={generating}
        destroyOnClose
      >
        <Form layout="vertical" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item label="生成数量" style={{ flex: 1, marginBottom: 16 }}>
              <InputNumber
                min={1}
                max={100}
                value={generateCount}
                onChange={(v) => setGenerateCount(v ?? 1)}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="有效期(小时，0为永久)" style={{ flex: 1, marginBottom: 16 }}>
              <InputNumber
                min={0}
                value={generateExpiryHours}
                onChange={(v) => setGenerateExpiryHours(v ?? 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </div>
          <Form.Item label="前缀 (可选)" style={{ marginBottom: 16 }}>
            <Input
              value={generatePrefix}
              onChange={(e) => setGeneratePrefix(e.target.value)}
              placeholder="例如：VIP"
            />
          </Form.Item>
          <Form.Item label="备注 (可选)" style={{ marginBottom: 0 }}>
            <Input
              value={generateNote}
              onChange={(e) => setGenerateNote(e.target.value)}
              placeholder="例如：VIP会员"
            />
          </Form.Item>
        </Form>
      </Modal>
    </AntdAdminLayout>
  )
}
