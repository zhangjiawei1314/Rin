import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { ReactNode } from 'react'

interface AntdProviderProps {
  children: ReactNode
}

export function AntdProvider({ children }: AntdProviderProps) {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff', // 与 Tailwind 蓝色保持一致
          borderRadius: 6,
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}