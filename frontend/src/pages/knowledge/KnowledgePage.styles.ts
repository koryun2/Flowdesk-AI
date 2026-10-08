import styled from 'styled-components'
import { Card } from '../../components/ui'
import { media } from '../../styles/theme'
import type { KnowledgeDocument } from '../../types'

export const KnowledgeStats = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 14px;

  ${media.phone} {
    grid-template-columns: repeat(2, 1fr);
  }

  ${media.small} {
    grid-template-columns: 1fr;
  }
`

export const StatCard = styled(Card)`
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 14px;

  > span {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 10px;
    color: ${({ theme }) => theme.violet};
    background: ${({ theme }) => theme.violetSoft};
  }

  > div {
    display: flex;
    flex-direction: column;
  }

  strong {
    font-size: 16px;
  }

  small {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }
`

export const AskCard = styled(Card)`
  margin-bottom: 14px;
  padding: 18px;
  border-color: #dcd9ff;
  background: linear-gradient(140deg, #fff 50%, #f7f5ff);
`

export const AskIntro = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  > span {
    display: grid;
    width: 36px;
    height: 36px;
    place-items: center;
    border-radius: 10px;
    color: ${({ theme }) => theme.violet};
    background: ${({ theme }) => theme.violetSoft};
  }

  h2 {
    font-size: 13px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textSecondary};
    font-size: 9px;
  }
`

export const QuestionForm = styled.form`
  display: flex;
  gap: 8px;
  margin-top: 15px;

  ${media.small} {
    flex-direction: column;

    button {
      width: 100%;
    }
  }
`

export const QuestionInput = styled.input`
  min-width: 0;
  height: 40px;
  flex: 1;
  padding: 0 12px;
  border: 1px solid ${({ theme }) => theme.borderStrong};
  border-radius: 9px;
  outline: 0;
  background: #fff;
  font-size: 11px;

  &:focus {
    border-color: #aaa5f7;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.08);
  }
`

export const AnswerLoading = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 18px;
`

export const KnowledgeAnswer = styled.div`
  margin-top: 17px;
  padding-top: 16px;
  border-top: 1px solid #e4e1fb;

  h3 {
    margin-top: 8px;
    font-size: 11px;
  }

  > p {
    max-width: 900px;
    margin-top: 6px;
    color: #4b5265;
    font-size: 11px;
    line-height: 1.65;
  }
`

export const AnswerLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  color: ${({ theme }) => theme.violet};
  font-size: 9px;
  font-weight: 700;
`

export const CitationList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;

  > span {
    grid-column: 1 / -1;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
  }

  ${media.phone} {
    grid-template-columns: 1fr;
  }
`

export const Citation = styled.button`
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: start;
  padding: 9px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  background: #fff;
  text-align: left;

  > strong {
    display: grid;
    width: 18px;
    height: 18px;
    place-items: center;
    border-radius: 5px;
    color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.primarySoft};
    font-size: 8px;
  }

  > span {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 3px;
  }

  b {
    font-size: 9px;
  }

  small {
    overflow: hidden;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 7px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  em {
    color: ${({ theme }) => theme.emerald};
    font-size: 8px;
    font-style: normal;
  }
`

export const LibraryCard = styled(Card)`
  overflow: hidden;
`

export const LibraryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  h2 {
    font-size: 13px;
  }

  p {
    margin-top: 3px;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 9px;
  }

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

  ${media.phone} {
    width: 100%;
  }
`

export const TableSkeleton = styled.div`
  display: grid;
  gap: 1px;
  padding: 8px 16px;
`

export const DocumentList = styled.div`
  padding: 0 16px;
`

export const DocumentRow = styled.article`
  display: grid;
  grid-template-columns: auto minmax(250px, 1fr) 70px 90px 110px auto;
  gap: 12px;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.border};

  &:last-child {
    border-bottom: 0;
  }

  ${media.laptop} {
    grid-template-columns: auto minmax(230px, 1fr) 70px 90px auto;
  }

  ${media.phone} {
    grid-template-columns: auto minmax(170px, 1fr) auto;
  }
`

export const DocumentIcon = styled.span<{ $sourceType: KnowledgeDocument['sourceType'] }>`
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 9px;
  color: ${({ theme, $sourceType }) =>
    $sourceType === 'url'
      ? theme.cyan
      : $sourceType === 'text'
        ? theme.violet
        : theme.primary};
  background: ${({ theme, $sourceType }) =>
    $sourceType === 'url'
      ? theme.cyanSoft
      : $sourceType === 'text'
        ? theme.violetSoft
        : theme.primarySoft};
`

export const TitleButton = styled.button`
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 10px;
  font-weight: 700;
  text-align: left;
`

export const TitleInput = styled.input`
  width: 100%;
  padding: 0 0 2px;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.primary};
  background: transparent;
  color: inherit;
  font-size: 10px;
  font-weight: 700;
  outline: none;
`

export const DocumentCol = styled.div`
  display: flex;
  min-width: 0;
  flex-direction: column;

  strong {
    font-size: 10px;
  }

  small {
    overflow: hidden;
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`

export const DocumentChunks = styled(DocumentCol)`
  strong {
    font-size: 9px;
    font-weight: 500;
  }

  ${media.phone} {
    display: none;
  }
`

export const DocumentUpdated = styled(DocumentCol)`
  strong {
    font-size: 9px;
    font-weight: 500;
  }

  ${media.laptop} {
    display: none;
  }
`

export const DocumentStatusWrap = styled.div`
  ${media.phone} {
    display: none;
  }
`

export const DocumentStatus = styled.span<{ $status: KnowledgeDocument['status'] }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 7px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 600;
  text-transform: capitalize;
  color: ${({ theme, $status }) =>
    $status === 'ready'
      ? theme.emerald
      : $status === 'failed'
        ? theme.red
        : theme.amber};
  background: ${({ theme, $status }) =>
    $status === 'ready'
      ? theme.emeraldSoft
      : $status === 'failed'
        ? theme.redSoft
        : theme.amberSoft};
`

export const SourceTypeTabs = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 7px;
  margin-bottom: 17px;

  ${media.phone} {
    grid-template-columns: 1fr;
  }
`

export const SourceTypeTab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  border: 1px solid
    ${({ theme, $active }) => ($active ? '#c7c3fa' : theme.border)};
  border-radius: 8px;
  color: ${({ theme, $active }) =>
    $active ? theme.primary : theme.textSecondary};
  background: ${({ theme, $active }) =>
    $active ? theme.primarySoft : '#fff'};
  font-size: 9px;
`

export const FileDropzone = styled.label`
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  margin-top: 16px;
  border: 1.5px dashed #cbd0dc;
  border-radius: 10px;
  color: ${({ theme }) => theme.primary};
  background: #fafbff;
  cursor: pointer;

  strong {
    color: ${({ theme }) => theme.text};
    font-size: 10px;
  }

  span {
    color: ${({ theme }) => theme.textTertiary};
    font-size: 8px;
  }

  input {
    display: none;
  }
`
