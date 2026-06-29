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
    'src/app/**/*.{ts,tsx}',
    '!src/app/**/*.d.ts',
    '!src/app/__tests__/**',
    '!src/app/main.tsx',
    '!src/app/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 5,
      functions: 5,
      lines: 5,
      statements: 5
    }
  }
};
