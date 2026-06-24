module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png)$': '<rootDir>/src/__tests__/__mocks__/fileMock.js'
  },
  transform: {
    '\\.(tsx|ts|js|jsx)?$': ['babel-jest', { presets: ['react-app'] }]
  },
  collectCoverageFrom: [
    'src/app/hooks/useApi.ts',
    'src/app/hooks/useTTS.ts',
    'src/app/components/ErrorBoundary.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 45,
      functions: 60,
      lines: 65,
      statements: 60
    }
  }
};
