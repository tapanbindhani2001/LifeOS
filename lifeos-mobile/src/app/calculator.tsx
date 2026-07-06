import { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { router } from 'expo-router'

interface HistoryItem {
  id: string
  expression: string
  result: string
}

export default function CalculatorScreen() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState('')
  const [scientificMode, setScientificMode] = useState(false)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Real-time calculation preview
  useEffect(() => {
    if (!expression.trim()) {
      setResult('')
      return
    }

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
          maximumFractionDigits: 6,
        })
        setResult(formattedResult)
      }
    } catch {
      // Silently ignore incomplete syntax
    }
  }, [expression])

  const handleInput = (val: string) => {
    const symbols = ['+', '-', '×', '÷', '*', '/', '^', '%', '.']
    if (symbols.includes(val)) {
      setExpression((prev) => {
        if (!prev) {
          if (val === '-') return '-'
          if (val === '.') return '0.'
          return ''
        }
        const lastChar = prev.slice(-1)
        if (symbols.includes(lastChar)) {
          return prev.slice(0, -1) + val
        }
        return prev + val
      })
      return
    }
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

    // Commit to history list
    const newHistoryItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      expression,
      result,
    }
    setHistory((prev) => [newHistoryItem, ...prev].slice(0, 20))
    setExpression(result.replace(/,/g, ''))
    setResult('')
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Calculator</Text>
        </View>
        <TouchableOpacity
          style={styles.toggleBtn}
          onPress={() => setScientificMode(!scientificMode)}
        >
          <Text style={styles.toggleText}>{scientificMode ? 'Standard' : 'Scientific'}</Text>
        </TouchableOpacity>
      </View>

      {/* Calculator Screen */}
      <View style={styles.screen}>
        <Text style={styles.exprText} numberOfLines={2}>{expression || '0'}</Text>
        <Text style={styles.resultText}>{result ? `= ${result}` : ''}</Text>
      </View>

      {/* Split keypad & history */}
      <View style={styles.body}>
        <View style={styles.keypad}>
          {scientificMode && (
            <View style={styles.row}>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleFunction('sin')}><Text style={styles.sciText}>sin</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleFunction('cos')}><Text style={styles.sciText}>cos</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleFunction('tan')}><Text style={styles.sciText}>tan</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleFunction('sqrt')}><Text style={styles.sciText}>√</Text></TouchableOpacity>
            </View>
          )}

          {scientificMode && (
            <View style={styles.row}>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleConstant('pi')}><Text style={styles.sciText}>π</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleConstant('e')}><Text style={styles.sciText}>e</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleInput('^')}><Text style={styles.sciText}>x^y</Text></TouchableOpacity>
              <TouchableOpacity style={styles.sciBtn} onPress={() => handleInput('(')}><Text style={styles.sciText}>(</Text></TouchableOpacity>
            </View>
          )}

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, styles.clearBtn]} onPress={handleClear}><Text style={styles.clearText}>C</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleBackspace}><Text style={styles.btnText}>⌫</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('%')}><Text style={styles.btnText}>%</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleInput('÷')}><Text style={styles.opText}>÷</Text></TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('7')}><Text style={styles.btnText}>7</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('8')}><Text style={styles.btnText}>8</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('9')}><Text style={styles.btnText}>9</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleInput('×')}><Text style={styles.opText}>×</Text></TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('4')}><Text style={styles.btnText}>4</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('5')}><Text style={styles.btnText}>5</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('6')}><Text style={styles.btnText}>6</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleInput('-')}><Text style={styles.opText}>-</Text></TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('1')}><Text style={styles.btnText}>1</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('2')}><Text style={styles.btnText}>2</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('3')}><Text style={styles.btnText}>3</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.opBtn]} onPress={() => handleInput('+')}><Text style={styles.opText}>+</Text></TouchableOpacity>
          </View>

          <View style={styles.row}>
            <TouchableOpacity style={[styles.btn, { flex: 2 }]} onPress={() => handleInput('0')}><Text style={[styles.btnText, { textAlign: 'left', paddingLeft: 24 }]}>0</Text></TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={() => handleInput('.')}><Text style={styles.btnText}>.</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.evalBtn]} onPress={handleEvaluate}><Text style={styles.evalText}>=</Text></TouchableOpacity>
          </View>
        </View>

        {/* History Tape */}
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>History</Text>
          <FlatList
            data={history}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.historyCard}
                onPress={() => { setExpression(item.expression); setResult(item.result) }}
              >
                <Text style={styles.historyExpr} numberOfLines={1}>{item.expression}</Text>
                <Text style={styles.historyResult}>= {item.result}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyHistory}>No calculations yet</Text>}
          />
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface.soft },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, paddingBottom: 0 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: Colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.ink[900] },
  toggleBtn: { backgroundColor: Colors.brand[50], paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.sm },
  toggleText: { color: Colors.brand[600], fontSize: FontSize.xs, fontWeight: '700' },
  screen: { flex: 1.3, justifyContent: 'flex-end', alignItems: 'flex-end', padding: Spacing.xl },
  exprText: { fontSize: FontSize.xxl, fontFamily: 'monospace', color: Colors.ink[500] },
  resultText: { fontSize: 36, fontWeight: '800', color: Colors.ink[900], marginTop: 8 },
  body: { flex: 4, paddingHorizontal: Spacing.md, gap: Spacing.md },
  keypad: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, height: 56, borderRadius: BorderRadius.md, backgroundColor: Colors.surface.white, alignItems: 'center', justifyContent: 'center', ...Shadow.sm },
  btnText: { fontSize: FontSize.xl, color: Colors.ink[900], fontWeight: '600', width: '100%', textAlign: 'center' },
  clearBtn: { backgroundColor: '#fef2f2' },
  clearText: { fontSize: FontSize.xl, color: Colors.status.error, fontWeight: '700' },
  opBtn: { backgroundColor: Colors.brand[50] },
  opText: { fontSize: FontSize.xl, color: Colors.brand[700], fontWeight: '700' },
  evalBtn: { backgroundColor: Colors.brand[500] },
  evalText: { fontSize: FontSize.xl, color: '#fff', fontWeight: '800' },
  sciBtn: { flex: 1, height: 40, borderRadius: BorderRadius.sm, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  sciText: { fontSize: FontSize.sm, color: Colors.brand[600], fontWeight: '700' },
  historySection: { flex: 1, borderTopWidth: 1, borderTopColor: Colors.surface.border, paddingTop: Spacing.sm },
  historyTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.ink[500], marginBottom: Spacing.xs },
  historyCard: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.surface.border + '50' },
  historyExpr: { fontSize: FontSize.xs, color: Colors.ink[400], fontFamily: 'monospace' },
  historyResult: { fontSize: FontSize.sm, color: Colors.ink[900], fontWeight: '700', marginTop: 2, fontFamily: 'monospace' },
  emptyHistory: { fontSize: FontSize.xs, color: Colors.ink[300], fontStyle: 'italic', marginTop: 10 },
})
