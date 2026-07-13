import { z } from 'zod'
import { bookPrStargazers } from './fixtures'
import {
  defaultPreset,
  defaultPrimaryColor,
  defaultShaderColor,
  defaultTextColor,
  presetIds,
} from './presets'

export const schema = z.object({
  user: z.string(),
  userAvatarUrl: z.string(),
  repository: z.string(),
  stars: z.number(),
  stargazers: z.array(z.string()),
  preset: z.enum(presetIds).default(defaultPreset),
  primaryColor: z.string().default(defaultPrimaryColor),
  shaderColor: z.string().default(defaultShaderColor),
  textColor: z.string().default(defaultTextColor),
})

export type Props = z.infer<typeof schema>

export const defaultProps: Props = {
  preset: defaultPreset,
  primaryColor: defaultPrimaryColor,
  shaderColor: defaultShaderColor,
  textColor: defaultTextColor,
  user: 'scastiel',
  userAvatarUrl: 'https://avatars.githubusercontent.com/u/301948?v=4',
  repository: 'book-pr',
  stars: 143,
  stargazers: bookPrStargazers.slice(0, 50).map((sg) => sg.avatar_url),
}
