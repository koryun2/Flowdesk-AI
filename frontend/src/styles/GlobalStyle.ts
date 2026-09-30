import { createGlobalStyle } from 'styled-components'

export const GlobalStyle = createGlobalStyle`
  :root {
    font-family: ${({ theme }) => theme.fontBody};
    color: ${({ theme }) => theme.text};
    background: ${({ theme }) => theme.bg};
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  * {
    box-sizing: border-box;
  }

  html {
    min-width: 320px;
    min-height: 100%;
    background: ${({ theme }) => theme.bg};
  }

  body {
    min-width: 320px;
    min-height: 100vh;
    margin: 0;
    background: ${({ theme }) => theme.bg};
  }

  body,
  button,
  input,
  textarea,
  select {
    font: inherit;
  }

  button,
  a,
  input,
  textarea,
  select {
    -webkit-tap-highlight-color: transparent;
  }

  button,
  select {
    cursor: pointer;
  }

  button {
    color: inherit;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  img,
  svg {
    display: block;
  }

  h1,
  h2,
  h3,
  h4,
  p,
  dl,
  dd {
    margin: 0;
  }

  h1,
  h2,
  h3,
  h4 {
    font-family: ${({ theme }) => theme.fontHeading};
    color: ${({ theme }) => theme.text};
  }

  input,
  textarea,
  select {
    color: ${({ theme }) => theme.text};
  }

  input::placeholder,
  textarea::placeholder {
    color: #a0a6b5;
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible,
  select:focus-visible {
    outline: 3px solid rgba(79, 70, 229, 0.2);
    outline-offset: 2px;
  }

  ::selection {
    color: #fff;
    background: ${({ theme }) => theme.primary};
  }

  ::-webkit-scrollbar {
    width: 9px;
    height: 9px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 999px;
    background: #c9cdd8;
    background-clip: padding-box;
  }

  #root {
    min-height: 100vh;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`
