export const isHexColor = value => /^#([0-9a-fA-F]{3}){1,2}$/.test(value)
export const isURL = value =>
  /^(ftp|https?):\/\/([\w\d-]+\.)+\w{2,}(\/.+)?$/.test(value)
export const isIn = allowedValues => value => allowedValues.includes(value)
export const isUUID = value =>
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/.test(value)
