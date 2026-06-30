module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js'
  },
  transform: {
    '\\.(tsx|ts|js|jsx)?$': ['babel-jest', { presets: [['react-app', { runtime: 'automatic' }]] }]
  },
  collectCoverageFrom: [
    'src/app/api.ts',
    'src/app/context/StoreContext.tsx',
    'src/app/pages/LoginPage.tsx',
    'src/app/hooks/useApi.ts',
    'src/app/components/ErrorBoundary.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
