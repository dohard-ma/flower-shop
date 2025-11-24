import dayjs from 'dayjs'

export const formatDate = (date: number, format: string = 'YYYY/MM/DD HH:mm') => {
  return dayjs(date).format(format)
}
