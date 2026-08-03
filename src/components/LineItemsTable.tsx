import React from 'react';
import { Plus, Trash2, AlertTriangle, Layers } from 'lucide-react';
import { LineItem, FieldStatus, LineItemFieldValidation } from '../types';

interface LineItemsTableProps {
  lineItems: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency: string;
  totalDue: number;
  fieldValidation?: LineItemFieldValidation[];
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  lineItems,
  onChange,
  currency,
  totalDue,
  fieldValidation,
}) => {
  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const updated = [...lineItems];
    const currentItem = { ...updated[index] };

    if (field === 'quantity' || field === 'unitPrice') {
      const numVal = parseFloat(value) || 0;
      (currentItem as any)[field] = numVal;
      // Auto-recalculate line amount
      const qty = field === 'quantity' ? numVal : currentItem.quantity;
      const price = field === 'unitPrice' ? numVal : currentItem.unitPrice;
      currentItem.lineAmount = Math.round(qty * price * 100) / 100;
    } else if (field === 'lineAmount') {
      currentItem.lineAmount = parseFloat(value) || 0;
    } else {
      (currentItem as any)[field] = value;
    }

    updated[index] = currentItem;
    onChange(updated);
  };

  const handleAddRow = () => {
    const newItem: LineItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      description: '',
      poReference: '',
      quantity: 1,
      unitPrice: 0,
      lineAmount: 0,
    };
    onChange([...lineItems, newItem]);
  };

  const handleDeleteRow = (index: number) => {
    const updated = lineItems.filter((_, i) => i !== index);
    onChange(updated);
  };

  const lineItemsTotal = lineItems.reduce((sum, item) => sum + (Number(item.lineAmount) || 0), 0);
  const roundedLineTotal = Math.round(lineItemsTotal * 100) / 100;
  const roundedTotalDue = Math.round((Number(totalDue) || 0) * 100) / 100;
  const hasTotalMismatch = Math.abs(roundedLineTotal - roundedTotalDue) > 0.01 && roundedTotalDue > 0;

  const renderBadge = (status?: FieldStatus) => {
    if (!status) return null;
    if (status === 'MISSING') {
      return <span className="text-[9px] px-1 py-0.2 font-bold bg-red-100 text-red-800 rounded uppercase">MISSING</span>;
    }
    if (status === 'UNCLEAR') {
      return <span className="text-[9px] px-1 py-0.2 font-bold bg-amber-100 text-amber-800 rounded uppercase">UNCLEAR</span>;
    }
    return null;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Line Items ({lineItems.length})</span>
        </h3>

        <button
          type="button"
          onClick={handleAddRow}
          className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider hover:underline flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>ADD ITEM</span>
        </button>
      </div>

      {hasTotalMismatch && (
        <div className="bg-amber-50 border border-amber-200 rounded p-2.5 text-xs text-amber-900 flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-[10px] uppercase tracking-wider">Total Mismatch Warning</span>
            <span>
              The sum of line item amounts ({currency || 'SGD'} {roundedLineTotal.toFixed(2)}) does not match the Total Amount Due ({currency || 'SGD'} {roundedTotalDue.toFixed(2)}).
            </span>
          </div>
        </div>
      )}

      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
            <tr>
              <th className="px-3 py-2 font-bold w-8 text-center">#</th>
              <th className="px-3 py-2 font-bold">Item Description <span className="text-red-500">*</span></th>
              <th className="px-3 py-2 font-bold w-24">Line PO Ref</th>
              <th className="px-3 py-2 font-bold w-20 text-right">Qty <span className="text-red-500">*</span></th>
              <th className="px-3 py-2 font-bold w-28 text-right">Unit Price <span className="text-red-500">*</span></th>
              <th className="px-3 py-2 font-bold w-32 text-right">Line Amount <span className="text-red-500">*</span></th>
              <th className="px-2 py-2 w-8 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lineItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 italic">
                  No line items listed. Click "+ ADD ITEM" to enter details.
                </td>
              </tr>
            ) : (
              lineItems.map((item, idx) => {
                const val = fieldValidation?.[idx];
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const statedAmount = Number(item.lineAmount) || 0;
                const calcAmount = Math.round(qty * unitPrice * 100) / 100;
                const isLineCalcDiscrepant = Math.abs(calcAmount - statedAmount) > 0.01;

                return (
                  <tr
                    key={item.id || `item-${idx}`}
                    className={`${
                      isLineCalcDiscrepant ? 'bg-amber-50/70' : idx % 2 === 1 ? 'bg-slate-50/50' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center space-x-1.5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                          placeholder="Item Description"
                          className={`w-full border p-1 rounded text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                            val?.description === 'MISSING'
                              ? 'border-red-300 bg-red-50'
                              : val?.description === 'UNCLEAR'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200'
                          }`}
                        />
                        {renderBadge(val?.description)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.poReference}
                        onChange={(e) => handleItemChange(idx, 'poReference', e.target.value)}
                        placeholder="N/A"
                        className="w-full border border-slate-200 p-1 rounded font-mono text-[11px] text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className={`w-full text-right border p-1 rounded font-mono text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                            val?.quantity === 'MISSING'
                              ? 'border-red-300 bg-red-50'
                              : val?.quantity === 'UNCLEAR'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200'
                          }`}
                        />
                        {renderBadge(val?.quantity)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className={`w-full text-right border p-1 rounded font-mono text-slate-800 bg-white outline-none focus:ring-1 focus:ring-indigo-500 ${
                            val?.unitPrice === 'MISSING'
                              ? 'border-red-300 bg-red-50'
                              : val?.unitPrice === 'UNCLEAR'
                              ? 'border-amber-300 bg-amber-50'
                              : 'border-slate-200'
                          }`}
                        />
                        {renderBadge(val?.unitPrice)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <input
                          type="number"
                          step="any"
                          value={item.lineAmount}
                          onChange={(e) => handleItemChange(idx, 'lineAmount', e.target.value)}
                          className={`w-full text-right border p-1 rounded font-mono font-medium outline-none focus:ring-1 focus:ring-indigo-500 ${
                            isLineCalcDiscrepant
                              ? 'border-amber-400 bg-amber-100/80 text-amber-900 font-bold'
                              : val?.lineAmount === 'MISSING'
                              ? 'border-red-300 bg-red-50 text-slate-900'
                              : 'border-slate-200 bg-white text-slate-900'
                          }`}
                        />
                        {renderBadge(val?.lineAmount)}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(idx)}
                        title="Remove row"
                        className="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
            <tr>
              <td colSpan={5} className="px-3 py-2 text-right text-slate-500 uppercase tracking-wider text-[10px]">
                Line Items Total:
              </td>
              <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">
                {currency || 'SGD'} {roundedLineTotal.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
