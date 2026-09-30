import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'

export const DataCard = styled(Card)`
  overflow: hidden;
`

export const StatusTabs = styled.div`
  display: flex;
  gap: 4px;
  padding: 12px 16px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  overflow-x: auto;
`

export const StatusTab = styled.button<{ $active?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 10px 11px;
  border: 0;
  border-bottom: 2px solid
    ${({ $active, theme }) => ($active ? theme.primary : 'transparent')};
  color: ${({ $active, theme }) =>
    $active ? theme.primary : theme.textSecondary};
  background: transparent;
  font-size: 10px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  white-space: nowrap;

  span {
    padding: 1px 5px;
    border-radius: 999px;
    background: #eef0f5;
    font-size: 8px;
  }
`

export const TableToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;

  ${media.phone} {
    align-items: stretch;
    flex-direction: column;
  }
`

export const TableSearch = styled.div`
  display: flex;
  width: min(350px, 100%);
  height: 35px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  color: ${({ theme }) => theme.textTertiary};
  background: #fff;

  &:focus-within {
    border-color: #b8b4f8;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }

  input {
    min-width: 0;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 10px;
  }

  button {
    display: grid;
    padding: 2px;
    border: 0;
    color: ${({ theme }) => theme.textTertiary};
    background: transparent;
  }

  ${media.phone} {
    width: 100%;
  }
`

export const FilterControls = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;

  label {
    display: flex;
    height: 35px;
    align-items: center;
    gap: 5px;
    padding: 0 7px;
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 8px;
    color: ${({ theme }) => theme.textTertiary};
    background: #fff;
  }

  select {
    max-width: 160px;
    border: 0;
    outline: 0;
    background: transparent;
    font-size: 13px;
  }

  ${media.laptop} {
    label {
      padding: 0 5px;
    }
  }

  ${media.phone} {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));

    label {
      width: 100%;
    }

    select {
      width: 100%;
      max-width: none;
    }
  }
`

export const ActiveFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #e5e2ff;
  border-bottom: 1px solid #e5e2ff;
  color: #5d56b5;
  background: #f7f6ff;
  font-size: 13px;

  button {
    margin-left: auto;
    border: 0;
    color: ${({ theme }) => theme.primary};
    background: transparent;
    font-size: 13px;
    font-weight: 600;
  }
`

export const BulkBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-top: 1px solid #e5e2ff;
  border-bottom: 1px solid #e5e2ff;
  color: #5d56b5;
  background: #f7f6ff;
  font-size: 13px;

  span {
    flex: 1;
  }

  button,
  select {
    border: 0;
    color: ${({ theme }) => theme.primary};
    background: transparent;
    font-size: 13px;
    font-weight: 600;
  }
`

export const TableSkeleton = styled.div`
  display: grid;
  gap: 1px;
  padding: 8px 16px;
`

export const TableScroll = styled.div`
  overflow-x: auto;
`

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th {
    height: 38px;
    padding: 0 12px;
    border-top: 1px solid ${({ theme }) => theme.border};
    border-bottom: 1px solid ${({ theme }) => theme.border};
    color: ${({ theme }) => theme.textTertiary};
    background: #fafbfc;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-align: left;
    text-transform: uppercase;
    white-space: nowrap;
  }

  td {
    height: 62px;
    padding: 8px 12px;
    border-bottom: 1px solid ${({ theme }) => theme.border};
    font-size: 10px;
  }

  tbody tr {
    transition: background 120ms;
  }

  tbody tr:hover {
    background: #fbfbfd;
  }

  tbody tr:last-child td {
    border-bottom: 0;
  }
`

export const CheckboxCell = styled.th`
  width: 36px;
  text-align: center !important;

  input {
    accent-color: ${({ theme }) => theme.primary};
  }
`

export const CheckboxDataCell = styled.td`
  width: 36px;
  text-align: center !important;

  input {
    accent-color: ${({ theme }) => theme.primary};
  }
`

export const TicketTitleCell = styled.td`
  min-width: 270px;

  a {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  span {
    color: ${({ theme }) => theme.textTertiary};
    font-family: ui-monospace, monospace;
    font-size: 8px;
  }

  strong {
    overflow: hidden;
    max-width: 360px;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a:hover strong {
    color: ${({ theme }) => theme.primary};
  }
`

export const CustomerCell = styled(Link)`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 130px;

  > span:not([class]) {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 9px;
    font-weight: 500;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const AssigneeCell = styled.span`
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 130px;
  font-size: 9px;
  font-weight: 500;
`

export const MutedCell = styled.td`
  color: ${({ theme }) => theme.textTertiary};
  white-space: nowrap;
`

export const TablePagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 11px 16px;
  border-top: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.textTertiary};
  font-size: 9px;

  > div {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  ${media.phone} {
    align-items: flex-start;
    flex-direction: column;
  }
`
