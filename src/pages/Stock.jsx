import { useEffect } from 'react'
import { Package, AlertTriangle, TrendingDown } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { Card, EmptyState } from '../components/UI'

export default function Stock() {
  const { stock, loadStock } = useApp()

  useEffect(() => { loadStock() }, [loadStock])

  const lowThreshold = 10

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-2">Stock</h1>
      <p className="text-sm text-gray-500 mb-6">
        <span className="font-medium text-gray-700">Total Stock</span> = overall purchased &nbsp;|&nbsp;
        <span className="font-medium text-gray-700">Available Stock</span> = remaining after sales
      </p>

      {stock.length === 0 ? (
        <Card><EmptyState icon={Package} message="No items in stock. Create items from Entry module." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {stock.map(s => {
            const isLow = s.available <= lowThreshold
            const soldQty = s.total - s.available
            const soldPct = s.total > 0 ? Math.round((soldQty / s.total) * 100) : 0

            return (
              <Card key={s.id} className={`p-4 ${isLow ? 'border-red-200 bg-red-50' : ''}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${isLow ? 'bg-red-100' : 'bg-blue-100'}`}>
                      <Package size={18} className={isLow ? 'text-red-600' : 'text-blue-600'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{s.itemName}</p>
                      <p className="text-xs text-gray-400">{s.unit}</p>
                    </div>
                  </div>
                  {isLow && <AlertTriangle size={16} className="text-red-500 shrink-0" />}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Total Stock — all purchased */}
                  <div className="bg-blue-50 rounded-lg p-2.5 text-center">
                    <p className="text-xs text-blue-500 font-medium mb-0.5">Total Stock</p>
                    <p className="font-bold text-blue-700 text-lg">{s.total}</p>
                    <p className="text-xs text-blue-400">{s.unit} purchased</p>
                  </div>
                  {/* Available Stock — after sales */}
                  <div className={`rounded-lg p-2.5 text-center ${isLow ? 'bg-red-100' : 'bg-green-50'}`}>
                    <p className={`text-xs font-medium mb-0.5 ${isLow ? 'text-red-500' : 'text-green-500'}`}>Available</p>
                    <p className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-green-600'}`}>{s.available}</p>
                    <p className={`text-xs ${isLow ? 'text-red-400' : 'text-green-400'}`}>{s.unit} left</p>
                  </div>
                </div>

                {/* Sold quantity indicator */}
                {soldQty > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <TrendingDown size={12} className="text-orange-400" />
                    <span>{soldQty} {s.unit} sold ({soldPct}%)</span>
                  </div>
                )}

                {/* Progress bar: available vs total */}
                {s.total > 0 && (
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isLow ? 'bg-red-400' : 'bg-green-400'}`}
                      style={{ width: `${Math.max(0, Math.min(100, (s.available / s.total) * 100))}%` }}
                    />
                  </div>
                )}

                {isLow && (
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Low stock alert
                  </p>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
