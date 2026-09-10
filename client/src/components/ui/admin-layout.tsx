import { Layout, Menu, Dropdown, Avatar } from 'antd'
import { useLocation } from 'wouter'
import {
  DashboardOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

const { Header, Content, Sider, Footer } = Layout

interface AntdAdminLayoutProps {
  children?: ReactNode
}

export function AntdAdminLayout({ children }: AntdAdminLayoutProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [location, setLocation] = useLocation()
  const { t } = useTranslation()

  // 菜单配置
  const menuItems = [
    {
      key: '/admin/dashboard',
      icon: <DashboardOutlined />,
      label: t('antd.menu.dashboard', '首页'),
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: t('antd.menu.users', '用户管理'),
    },
    {
      key: '/admin/content',
      icon: <FileTextOutlined />,
      label: t('antd.menu.content', '内容管理'),
      children: [
        {
          key: '/admin/feed',
          label: t('antd.menu.writing', '文章管理'),
        },
        {
          key: '/admin/tags',
          label: t('antd.menu.tags', '标签管理'),
        },
      ],
    },
    {
      key: '/admin/config',
      icon: <SettingOutlined />,
      label: t('/admin/config', '系统设置'),
    },
  ]

  // 用户菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('antd.menu.profile', '个人资料'),
      onClick: () => setLocation('/profile'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('antd.menu.logout', '退出登录'),
      onClick: () => {
        // TODO: 实现退出登录逻辑
        console.log('Logout')
      },
    },
  ]

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    setLocation(key)
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 侧边栏 */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <div className="h-16 flex items-center justify-center text-white text-xl font-bold">
          {collapsed ? 'Rin' : '管理后台'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location]}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200 }}>
        {/* 顶部导航 */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          {/* 折叠按钮 */}
          <div
            className="cursor-pointer text-lg"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{t('antd.welcome', '欢迎回来')}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ backgroundColor: '#1677ff', cursor: 'pointer' }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </div>
        </Header>

        {/* 内容区域 */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: '#fff',
            borderRadius: '8px',
            minHeight: 280,
          }}
        >
          {children}
        </Content>

        {/* 底部 */}
        <Footer style={{ textAlign: 'center', background: '#fff' }}>
          Rin Admin ©{new Date().getFullYear()} Created with Ant Design
        </Footer>
      </Layout>
    </Layout>
  )
}