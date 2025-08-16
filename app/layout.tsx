import './globals.css'

export const metadata = {
  title: 'FreeWhen',
  description: 'Find common free times with your friends.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  )
}
