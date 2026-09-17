import { defaultProps, type Props } from "../video/schema";

/** Studio fixtures stay in defaultProps. Runtime/export never inherit demo faces. */
export function resolveInputProps(input: Partial<Props>): Props {
  return {
    ...defaultProps,
    ...input,
    stargazers: Array.isArray(input.stargazers) ? input.stargazers : [],
  };
}
