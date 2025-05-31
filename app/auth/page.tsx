import AuthForm from '@/components/auth/AuthForm'

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Welcome to BountyCam</h1>
        <p className="mt-2 text-gray-600">Sign in or create an account to get started</p>
      </div>
      <AuthForm />
    </div>
  )
}