function autosizeWorksheet(worksheet, rows) {
  const columnCount = rows.reduce((max, row) => Math.max(max, row.length), 0)

  worksheet.columns = Array.from({ length: columnCount }, (_, index) => {
    const width = rows.reduce((max, row) => {
      const value = row[index]
      const text = value === null || value === undefined ? '' : String(value)
      return Math.max(max, text.length)
    }, 10)

    return { width: Math.min(Math.max(width + 2, 12), 40) }
  })
}

export async function downloadWorkbook(filename, buildWorkbook) {
  const ExcelJS = (await import('exceljs')).default
  const workbook = new ExcelJS.Workbook()
  await buildWorkbook(workbook)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  )

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function addWorksheetFromObjects(workbook, name, rows) {
  const worksheet = workbook.addWorksheet(name)
  if (!rows.length) return worksheet

  const headers = Object.keys(rows[0])
  worksheet.addRow(headers)
  rows.forEach(row => worksheet.addRow(headers.map(header => row[header])))
  autosizeWorksheet(worksheet, [
    headers,
    ...rows.map(row => headers.map(header => row[header]))
  ])

  return worksheet
}
