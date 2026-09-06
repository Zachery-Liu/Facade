# Hook Guidelines

## Observed pattern

Custom hooks are named `useX`, use Preact hooks, and return explicit state/actions. `useCopyFeedback` owns transient copy acknowledgement; `useSelectionInput` owns a selected asset ID and derives selection with the shared core function.

Keep hooks browser-enhancement focused. `useSelectionInput` imports `deriveSelectionState` rather than duplicating policy. There is no client-side GitHub fetching.

Do not use effects for values directly derivable from props or use a hook to mutate manifest data.
