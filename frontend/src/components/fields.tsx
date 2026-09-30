import styled from 'styled-components'
import { media } from '../styles/theme'

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;

  ${media.phone} {
    grid-template-columns: 1fr;
  }
`

export const FormField = styled.div<{ $full?: boolean }>`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
  grid-column: ${({ $full }) => ($full ? '1 / -1' : 'auto')};

  ${media.phone} {
    grid-column: auto;
  }

  > label {
    color: #4b5265;
    font-size: 10px;
    font-weight: 600;
  }

  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid ${({ theme }) => theme.borderStrong};
    border-radius: 8px;
    outline: 0;
    background: #fff;
    font-size: 11px;
    transition:
      border-color 150ms,
      box-shadow 150ms;
  }

  input,
  select {
    height: 39px;
    padding: 0 11px;
  }

  textarea {
    min-height: 92px;
    padding: 10px 11px;
    resize: vertical;
  }

  input:focus,
  textarea:focus,
  select:focus {
    border-color: #a9a4f6;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  input[aria-invalid='true'],
  textarea[aria-invalid='true'],
  select[aria-invalid='true'] {
    border-color: #ef8b95;
  }

  > span {
    color: ${({ theme }) => theme.red};
    font-size: 12px;
  }
`

export const FormError = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.red};
  font-size: 12px;
`

export const LabelRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #4b5265;
  font-size: 10px;
  font-weight: 600;

  button {
    border: 0;
    color: ${({ theme }) => theme.primary};
    background: transparent;
    font-size: 9px;
  }
`

export const PasswordInput = styled.div`
  position: relative;

  input {
    padding-right: 42px;
  }

  button {
    position: absolute;
    top: 3px;
    right: 3px;
    display: grid;
    width: 34px;
    height: 33px;
    place-items: center;
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }
`

export const InputWithIcon = styled.div`
  position: relative;

  svg {
    position: absolute;
    top: 12px;
    left: 11px;
    color: ${({ theme }) => theme.textTertiary};
  }

  input {
    padding-left: 34px;
  }
`
