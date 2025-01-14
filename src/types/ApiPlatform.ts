import { Resource } from './Resource'

export type HydraMapping = {
  property: string
  required: boolean
  variable: string
}

export type ApiListResponse = {
  'hydra:search'?: {
    'hydra:mapping'?: HydraMapping[]
  }
  'hydra:view': {
    'hydra:first'?: string
    'hydra:last'?: string
    'hydra:next'?: string
  }
  'hydra:totalItems': number
  'hydra:member': Array<Resource<string, string>>
}
