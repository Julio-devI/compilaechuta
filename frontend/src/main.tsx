import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { installFetchInterceptor } from './services/setupFetchInterceptor'
import './index.css'

installFetchInterceptor()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
