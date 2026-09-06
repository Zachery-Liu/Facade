import { useCallback, useState } from 'preact/hooks';
export function useCopyFeedback() { const [copied, setCopied] = useState(false); const acknowledgeCopy = useCallback(() => setCopied(true), []); return { copied, acknowledgeCopy }; }
