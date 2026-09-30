import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Button } from '../../components/ui'
import { media } from '../../styles/theme'

export const AuthLayout = styled.div`
  display: grid;
  min-height: 100vh;
  grid-template-columns: minmax(420px, 0.95fr) minmax(480px, 1.05fr);
  background: #fff;

  ${media.tablet} {
    grid-template-columns: 1fr;
  }
`

export const AuthShowcase = styled.section`
  position: relative;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  overflow: hidden;
  padding: 38px 8%;
  color: #fff;
  background:
    radial-gradient(circle at 80% 12%, rgba(139, 92, 246, 0.5), transparent 30%),
    radial-gradient(circle at 8% 82%, rgba(8, 145, 178, 0.35), transparent 28%),
    linear-gradient(145deg, #1e194d 0%, #30266c 52%, #242057 100%);

  &::before,
  &::after {
    position: absolute;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 50%;
    content: '';
  }

  &::before {
    top: 20%;
    right: -30%;
    width: 600px;
    height: 600px;
  }

  &::after {
    top: 32%;
    right: -13%;
    width: 350px;
    height: 350px;
  }

  h1 {
    max-width: 620px;
    color: #fff;
    font-size: clamp(36px, 4vw, 58px);
    line-height: 1.08;
    letter-spacing: -0.05em;
  }

  ul {
    display: grid;
    gap: 11px;
    margin: 28px 0 0;
    padding: 0;
    list-style: none;
  }

  li {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #e5e3f3;
    font-size: 12px;
  }

  li svg {
    padding: 3px;
    border-radius: 50%;
    color: #fff;
    background: rgba(94, 234, 212, 0.17);
  }

  ${media.tablet} {
    display: none;
  }
`

export const AuthBrand = styled(Link)`
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fff;
  font-family: ${({ theme }) => theme.fontHeading};
  font-size: 17px;
  font-weight: 700;

  > span {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(8px);
  }

  strong {
    color: #aaa3ff;
  }
`

export const ShowcaseContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 560px;
  margin: auto 0;
  padding: 70px 0;

  > p {
    max-width: 520px;
    margin-top: 20px;
    color: #bdb9d9;
    font-size: 15px;
    line-height: 1.65;
  }
`

export const AuthKicker = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 20px;
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 999px;
  color: #d6d2ff;
  background: rgba(255, 255, 255, 0.07);
  font-size: 10px;
  font-weight: 600;
`

export const AuthProofCard = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(12px);
`

export const AuthProofMetric = styled.div`
  display: flex;
  flex-direction: column;
  padding: 15px 18px;

  & + & {
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  span {
    font-family: ${({ theme }) => theme.fontHeading};
    font-size: 19px;
    font-weight: 700;
  }

  small {
    margin-top: 3px;
    color: #aaa7c4;
    font-size: 9px;
  }
`

export const AuthFormPanel = styled.main`
  display: grid;
  place-items: center;
  padding: 42px;
  background: #fff;

  ${media.small} {
    padding: 24px 18px;
  }
`

export const AuthFormWrap = styled.div`
  width: 100%;
  max-width: 400px;
`

export const AuthFormHeading = styled.div`
  margin-bottom: 26px;
  text-align: center;

  h2 {
    font-size: 25px;
    letter-spacing: -0.035em;
  }

  p {
    margin-top: 7px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 11px;
  }
`

export const AuthFormHeadingIcon = styled.span`
  display: grid;
  width: 44px;
  height: 44px;
  margin: 0 auto 13px;
  place-items: center;
  border-radius: 13px;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
`

export const AuthForm = styled.form`
  display: grid;
  gap: 15px;
`

export const AuthSubmit = styled(Button)`
  width: 100%;
  margin-top: 4px;
`

export const DemoLogin = styled.button`
  padding: 8px;
  border: 0;
  color: ${({ theme }) => theme.primary};
  background: transparent;
  font-size: 10px;
  font-weight: 600;
`

export const AuthSwitch = styled.p`
  margin-top: 20px;
  color: ${({ theme }) => theme.textSecondary};
  font-size: 10px;
  text-align: center;

  a {
    color: ${({ theme }) => theme.primary};
    font-weight: 600;
  }
`

export const AuthLegal = styled.p`
  margin-top: 34px;
  color: ${({ theme }) => theme.textTertiary};
  font-size: 8px;
  text-align: center;
`
