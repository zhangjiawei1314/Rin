import { Layout } from 'antd'
import { ReactNode } from 'react'
import { Header } from '../header'
import Footer from '../footer'

const { Content } = Layout

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <Layout className={`min-h-screen ${className}`}>
      <Header />
      <Content className="flex-1">
        {children}
      </Content>
      <Footer />
    </Layout>
  )
}