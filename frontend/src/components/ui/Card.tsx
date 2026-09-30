import styled from 'styled-components'

export const Card = styled.div`
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radiusLg};
  background: ${({ theme }) => theme.surface};
  box-shadow: ${({ theme }) => theme.shadowXs};
`
