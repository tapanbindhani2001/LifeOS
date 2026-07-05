import { useState, useEffect, useRef } from 'react'
import { History, RotateCcw } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'

interface HistoryItem {
  id: string
  expression: string
  result: string
  timestamp: Date
}

export default function CalculatorPage() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState('')
  const [scientificMode, setScientificMode] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const displayEndRef = useRef<HTMLDivElement>(null)

  // Listen to keyboard inputs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        return // Ignore keyboard bindings when user is typing in form inputs
      }

      const key = e.key
      if (/[0-9]/.test(key)) {
        handleInput(key)
      } else if (['+', '-', '*', '/', '.', '(', ')'].includes(key)) {
        handleInput(key)
      } else if (key === 'Enter' || key === '=') {
        e.preventDefault()
        handleEvaluate()
      } else if (key === 'Backspace') {
        handleBackspace()
      } else if (key === 'Escape') {
        handleClear()
      }
    };

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expression])

  // Real-time calculator evaluation as the user types
  useEffect(() => {
    if (!expression.trim()) {
      setResult('')
      return
    }

    // Skip evaluating if the expression ends with an incomplete operator or parenthesis
    const lastChar = expression.trim().slice(-1)
    if (['+', '-', '×', '÷', '^', '(', ','].includes(lastChar)) {
      return
    }

    try {
      let parsedExpr = expression
        .replace(/π/g, 'Math.PI')
        .replace(/e/g, 'Math.E')
        .replace(/sin\(/g, 'Math.sin(')
        .replace(/cos\(/g, 'Math.cos(')
        .replace(/tan\(/g, 'Math.tan(')
        .replace(/log\(/g, 'Math.log10(')
        .replace(/ln\(/g, 'Math.log(')
        .replace(/sqrt\(/g, 'Math.sqrt(')
        .replace(/pow\(/g, 'Math.pow(')
        .replace(/÷/g, '/')
        .replace(/×/g, '*')
        .replace(/\^/g, '**')

      const sanitizedMatch = parsedExpr.match(/^[0-9+\-*/().\s]|Math\.[a-zA-Z0-9_()]+|pow|sqrt|log|ln|sin|cos|tan|\*\*$/g)
      const isSafe = sanitizedMatch && sanitizedMatch.join('') === parsedExpr.replace(/\s+/g, '')

      if (!isSafe) {
        const safeRegex = /^[0-9+\-*/().\s]*$/
        if (!safeRegex.test(parsedExpr.replace(/Math\.(PI|E|sin|cos|tan|log10|log|sqrt|pow)/g, ''))) {
          return
        }
      }

      const evalFn = new Function(`return (${parsedExpr})`)
      const evalResult = evalFn()

      if (evalResult !== undefined && !Number.isNaN(evalResult)) {
        const formattedResult = Number(evalResult).toLocaleString('en-US', {
          maximumFractionDigits: 8,
        })
        setResult(formattedResult)
      }
    } catch {
      // Silently ignore errors during typing
    }
  }, [expression])

  // Scroll display to the end when expression changes
  useEffect(() => {
    displayEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [expression])

  const handleInput = (val: string) => {
    setExpression((prev) => prev + val)
  }

  const handleClear = () => {
    setExpression('')
    setResult('')
  }

  const handleBackspace = () => {
    setExpression((prev) => prev.slice(0, -1))
  }

  const handleConstant = (constant: 'pi' | 'e') => {
    const displaySymbol = constant === 'pi' ? 'π' : 'e'
    setExpression((prev) => prev + displaySymbol)
  }

  const handleFunction = (funcName: string) => {
    setExpression((prev) => prev + funcName + '(')
  }

  const handleEvaluate = () => {
    if (!expression.trim() || !result || result === 'Error') return

    // Save to history list
    const newHistoryItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      expression,
      result,
      timestamp: new Date(),
    }
    setHistory((prev) => [newHistoryItem, ...prev].slice(0, 50))
    
    // Set expression to the solved result for chaining subsequent calculations
    setExpression(result.replace(/,/g, ''))
    setResult('')
  }

  const handleHistoryClick = (item: HistoryItem) => {
    setExpression(item.expression)
    setResult(item.result)
  }

  const clearHistory = () => {
    setHistory([])
  }

  return (
    <AppLayout title="Advanced Calculator" subtitle="Perform complex computations with live expression history.">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        
        {/* Main Calculator */}
        <div className="card flex flex-col p-6">
          
          {/* Scientific Mode Toggle */}
          <div className="mb-4 flex items-center justify-between border-b border-surface-border pb-4">
            <span className="font-display text-sm font-bold text-ink-900">Computation Mode</span>
            <div className="flex gap-1.5 rounded-lg bg-surface-soft p-1">
              <button
                onClick={() => setScientificMode(false)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  !scientificMode ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setScientificMode(true)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                  scientificMode ? 'bg-white text-brand-600 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Scientific
              </button>
            </div>
          </div>

          {/* Calculator Screen */}
          <div className="mb-6 flex flex-col justify-end rounded-2xl bg-surface-soft p-5 text-right font-mono">
            <div className="min-h-8 overflow-x-auto whitespace-nowrap text-lg text-ink-500">
              {expression || '0'}
              <div ref={displayEndRef} />
            </div>
            <div className="mt-2 min-h-12 overflow-x-auto whitespace-nowrap text-3xl font-bold text-ink-900">
              {result ? `= ${result}` : ''}
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            
            {/* Scientific Row 1 */}
            {scientificMode && (
              <>
                <button onClick={() => handleFunction('sin')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">sin</button>
                <button onClick={() => handleFunction('cos')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">cos</button>
                <button onClick={() => handleFunction('tan')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">tan</button>
                <button onClick={() => handleFunction('sqrt')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">√</button>
              </>
            )}

            {/* Scientific Row 2 */}
            {scientificMode && (
              <>
                <button onClick={() => handleFunction('log')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">log</button>
                <button onClick={() => handleFunction('ln')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">ln</button>
                <button onClick={() => handleConstant('pi')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">π</button>
                <button onClick={() => handleConstant('e')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">e</button>
              </>
            )}

            {/* Scientific Row 3 */}
            {scientificMode && (
              <>
                <button onClick={() => handleInput('^')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">x^y</button>
                <button onClick={() => handleInput('(')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">(</button>
                <button onClick={() => handleInput(')')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">)</button>
                <button onClick={() => handleInput(',')} className="btn-secondary !bg-brand-50/50 hover:!bg-brand-100/50 !text-brand-700 !py-3 font-semibold">,</button>
              </>
            )}

            {/* Row 1 */}
            <button onClick={handleClear} className="btn-secondary !bg-red-50 hover:!bg-red-100 !text-red-600 !py-3 font-bold">C</button>
            <button onClick={handleBackspace} className="btn-secondary !py-3 font-semibold">⌫</button>
            <button onClick={() => handleInput('%')} className="btn-secondary !py-3 font-semibold">%</button>
            <button onClick={() => handleInput('÷')} className="btn-secondary !bg-brand-50 hover:!bg-brand-100 !text-brand-700 !py-3 font-bold text-lg">÷</button>

            {/* Row 2 */}
            <button onClick={() => handleInput('7')} className="btn-secondary !bg-white !py-3 font-medium text-lg">7</button>
            <button onClick={() => handleInput('8')} className="btn-secondary !bg-white !py-3 font-medium text-lg">8</button>
            <button onClick={() => handleInput('9')} className="btn-secondary !bg-white !py-3 font-medium text-lg">9</button>
            <button onClick={() => handleInput('×')} className="btn-secondary !bg-brand-50 hover:!bg-brand-100 !text-brand-700 !py-3 font-bold text-lg">×</button>

            {/* Row 3 */}
            <button onClick={() => handleInput('4')} className="btn-secondary !bg-white !py-3 font-medium text-lg">4</button>
            <button onClick={() => handleInput('5')} className="btn-secondary !bg-white !py-3 font-medium text-lg">5</button>
            <button onClick={() => handleInput('6')} className="btn-secondary !bg-white !py-3 font-medium text-lg">6</button>
            <button onClick={() => handleInput('-')} className="btn-secondary !bg-brand-50 hover:!bg-brand-100 !text-brand-700 !py-3 font-bold text-lg">-</button>

            {/* Row 4 */}
            <button onClick={() => handleInput('1')} className="btn-secondary !bg-white !py-3 font-medium text-lg">1</button>
            <button onClick={() => handleInput('2')} className="btn-secondary !bg-white !py-3 font-medium text-lg">2</button>
            <button onClick={() => handleInput('3')} className="btn-secondary !bg-white !py-3 font-medium text-lg">3</button>
            <button onClick={() => handleInput('+')} className="btn-secondary !bg-brand-50 hover:!bg-brand-100 !text-brand-700 !py-3 font-bold text-lg">+</button>

            {/* Row 5 */}
            <button onClick={() => handleInput('0')} className="btn-secondary col-span-2 !bg-white !py-3 font-medium text-lg text-left pl-7">0</button>
            <button onClick={() => handleInput('.')} className="btn-secondary !bg-white !py-3 font-semibold text-lg">.</button>
            <button onClick={handleEvaluate} className="btn-primary !py-3 font-bold text-lg">=</button>
          </div>
        </div>

        {/* History Panel */}
        <div className="card flex flex-col p-5">
          <div className="mb-4 flex items-center justify-between border-b border-surface-border pb-3">
            <span className="flex items-center gap-2 font-display text-sm font-bold text-ink-900">
              <History className="h-4 w-4 text-ink-500" /> Computation History
            </span>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs font-semibold text-red-500 hover:text-red-600 hover:underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                className="group w-full rounded-xl border border-surface-border bg-surface-soft/40 p-3 text-left transition-colors hover:bg-brand-50/20 hover:border-brand-100"
              >
                <p className="truncate font-mono text-xs text-ink-500">{item.expression}</p>
                <p className="mt-1 font-mono text-sm font-bold text-ink-900 text-right group-hover:text-brand-600">
                  = {item.result}
                </p>
              </button>
            ))}
            {history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RotateCcw className="h-5 w-5 text-ink-300 animate-spin-slow mb-2" />
                <p className="text-xs text-ink-500">No calculations recorded yet.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  )
}
