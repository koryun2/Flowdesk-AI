import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'

export const SettingsLayout = styled.div`
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 14px;
  align-items: start;

  ${media.tablet} {
    grid-template-columns: 1fr;
  }
`

export const SettingsNav = styled(Card)`
  display: grid;
  padding: 7px;

  ${media.tablet} {
    display: flex;
    padding: 6px;
    overflow-x: auto;
  }
`

export const SettingsNavButton = styled.button<{ $active: boolean }>`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px;
  border: 0;
  border-radius: 8px;
  color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.textSecondary};
  background: ${({ theme, $active }) =>
    $active ? theme.primarySoft : 'transparent'};
  font-size: 9px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  text-align: left;

  ${media.tablet} {
    grid-template-columns: auto 1fr;
    white-space: nowrap;

    svg:last-child {
      display: none;
    }
  }
`

export const SettingsContent = styled.div``

export const SettingsPanel = styled(Card)`
  overflow: hidden;
`

export const SettingsPanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 18px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  h2 {
    font-size: 14px;
  }

  p {
    margin-top: 4px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }
`

export const ProfilePhotoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 18px 0;

  p {
    margin-top: 5px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const SettingsForm = styled.div`
  padding: 18px;
`

export const SettingsPanelFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  padding: 13px 18px;
  border-top: 1px solid ${({ theme }) => theme.border};
  background: #fafbfc;
`

export const SettingsCallout = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 18px 18px;
  padding: 12px;
  border: 1px solid #eadfbe;
  border-radius: 9px;
  color: ${({ theme }) => theme.amber};
  background: #fffcf3;

  > div {
    flex: 1;
  }

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 10px;
  }

  p {
    margin-top: 2px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 8px;
  }
`

export const ConnectedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 999px;
  color: ${({ theme }) => theme.emerald};
  background: ${({ theme }) => theme.emeraldSoft};
  font-size: 8px;
  font-weight: 600;
  text-transform: capitalize;

  i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: currentColor;
  }
`

export const SettingsOption = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 18px;
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > div {
    flex: 1;
  }

  strong {
    font-size: 10px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const SettingsOptionIcon = styled.span`
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 9px;
  color: ${({ theme }) => theme.primary};
  background: ${({ theme }) => theme.primarySoft};
`

export const Switch = styled.label`
  position: relative;
  width: 35px;
  height: 20px;

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #d5d8e0;
    transition: background 150ms;
  }

  span::before {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18);
    content: '';
    transition: transform 150ms;
  }

  input:checked + span {
    background: ${({ theme }) => theme.primary};
  }

  input:checked + span::before {
    transform: translateX(15px);
  }
`

export const SettingsModelSelect = styled.div`
  padding: 17px 18px;
`

export const IntegrationRow = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 18px;
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > span {
    display: grid;
    width: 36px;
    height: 36px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 9px;
    color: ${({ theme }) => theme.primary};
    font-size: 10px;
    font-weight: 700;
  }

  > div {
    flex: 1;
  }

  strong {
    font-size: 10px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const SecurityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 18px;
  padding: 15px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  > span {
    display: grid;
    width: 34px;
    height: 34px;
    flex: 0 0 auto;
    place-items: center;
    border-radius: 9px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
  }

  > div {
    flex: 1;
  }

  strong {
    font-size: 10px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`
