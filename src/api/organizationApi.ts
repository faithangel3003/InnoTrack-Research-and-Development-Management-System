import * as companyApi from './companyApi'

export type Organization = {
  id: string
  name: string
}

export async function getAllOrganizations() {
  const data = await companyApi.getAll({
    page: 1,
    pageSize: 250,
    search: '',
    status: '',
  })

  return data.items.map((item) => ({ id: item.id, name: item.name }))
}
