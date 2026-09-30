import styled from 'styled-components'

export const NotFound = styled.div`
  display: flex;
  min-height: calc(100vh - 150px);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;

  > span {
    display: grid;
    width: 62px;
    height: 62px;
    margin-bottom: 15px;
    place-items: center;
    border-radius: 18px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }

  > small {
    color: ${({ theme }) => theme.primary};
    font-weight: 700;
    letter-spacing: 0.1em;
  }

  h1 {
    margin-top: 6px;
    font-size: 22px;
  }

  p {
    margin: 8px 0 16px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 11px;
  }
`
