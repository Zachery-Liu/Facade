# Hook Guidelines

## Observed pattern

Custom hooks are named `useX`, use Preact hooks, and return explicit state/actions. `useCopyFeedback` owns transient copy acknowledgement; `useSelectionInput` takes detected environment hints, lets a caller override them manually, and derives selection with the shared core function.

Keep hooks browser-enhancement focused. The production page uses a small browser runtime with the same `selectInstallation` import; hooks remain available for Preact integrations. There is no client-side GitHub fetching.

Do not use effects for values directly derivable from props or use a hook to mutate manifest data.
