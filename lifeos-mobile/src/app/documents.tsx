import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Linking, Modal, Platform, AppState
} from 'react-native'
import { Image } from 'expo-image'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme'
import { useTheme, makeStyles } from '../context/ThemeContext'
import { router } from 'expo-router'
import { documentsApi } from '../api/features'
import Toast from 'react-native-toast-message'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as ImagePicker from 'expo-image-picker'
import * as LocalAuthentication from 'expo-local-authentication'
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg'

const VAULT_PASSCODE_KEY = 'vault_passcode'

function fileEmoji(fileType: string): string {
  if (!fileType) return '📄'
  if (fileType.includes('pdf')) return '📕'
  if (fileType.includes('image') || fileType.includes('jpeg') || fileType.includes('png')) return '🖼️'
  if (fileType.includes('word') || fileType.includes('docx')) return '📝'
  if (fileType.includes('sheet') || fileType.includes('xlsx') || fileType.includes('csv')) return '📊'
  if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️'
  return '📄'
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B'
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${bytes} B`
}

type TabType = 'all' | 'images' | 'docs' | 'others'

export default function DocumentsScreen() {
  const qc = useQueryClient()
  const { colors } = useTheme()
  const styles = useStyles()

  // Security Lock States
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hasPasscode, setHasPasscode] = useState(false)
  const [passcodeMode, setPasscodeMode] = useState<'enter' | 'set' | 'confirm'>('enter')
  const [pinInput, setPinInput] = useState('')
  const [tempPin, setTempPin] = useState('')
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [isBiometricSupported, setIsBiometricSupported] = useState(false)
  const [isBiometricEnrolled, setIsBiometricEnrolled] = useState(false)
  const [useBiometrics, setUseBiometrics] = useState(false)

  // Filtering State
  const [activeTab, setActiveTab] = useState<TabType>('all')

  // Upload States
  const [uploading, setUploading] = useState(false)

  // Fullscreen Image Lightbox Preview States
  const [previewImageId, setPreviewImageId] = useState<string | null>(null)
  const [previewImageName, setPreviewImageName] = useState<string>('')

  // Fetch Documents
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.list,
    enabled: isUnlocked, // Only fetch once unlocked
  })

  // Fetch Storage Summary
  const { data: storageInfo, isLoading: isStorageLoading } = useQuery({
    queryKey: ['storageSummary'],
    queryFn: documentsApi.getStorage,
    enabled: isUnlocked,
  })

  // Check passcode presence on load
  useEffect(() => {
    async function checkPasscode() {
      const stored = await AsyncStorage.getItem(VAULT_PASSCODE_KEY)
      if (stored) {
        setHasPasscode(true)
        setPasscodeMode('enter')
      } else {
        setHasPasscode(false)
        setPasscodeMode('set')
      }
    }
    checkPasscode()
  }, [])

  // Load Auth Token for authenticated Image components
  useEffect(() => {
    async function loadToken() {
      const token = await AsyncStorage.getItem('lifeos_token')
      setAuthToken(token)
    }
    if (isUnlocked) {
      loadToken()
    }
  }, [isUnlocked])

  // Inactivity Auto-Lock Listener: lock vault instantly when app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        lockVault()
      }
    })
    return () => {
      subscription.remove()
    }
  }, [])

  // Biometric Enrollment hardware check & auto-trigger
  useEffect(() => {
    async function checkBiometrics() {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      setIsBiometricSupported(compatible)
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        setIsBiometricEnrolled(enrolled)
        
        // Check user biometric preferences toggle state
        const savedPref = await AsyncStorage.getItem('vault_use_biometrics')
        const isOptedIn = savedPref === 'true'
        setUseBiometrics(isOptedIn)

        if (isOptedIn && enrolled && !isUnlocked && hasPasscode && passcodeMode === 'enter') {
          // Auto trigger biometric scan overlay immediately
          triggerBiometricUnlock()
        }
      }
    }
    if (hasPasscode && !isUnlocked) {
      checkBiometrics()
    }
  }, [hasPasscode, isUnlocked, passcodeMode])

  // Delete Document
  const deleteDoc = useMutation({
    mutationFn: (id: string) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] })
      qc.invalidateQueries({ queryKey: ['storageSummary'] })
      Toast.show({ type: 'success', text1: 'Document deleted' })
    },
    onError: (e: any) => Toast.show({ type: 'error', text1: e.message || 'Could not delete' }),
  })

  const handleDownload = (doc: any) => {
    const url = documentsApi.downloadUrl(doc.id)
    Alert.alert(
      'Open Document',
      `Open "${doc.fileName}" in your browser?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => Linking.openURL(url) },
      ]
    )
  }

  const handleDelete = (doc: any) => {
    Alert.alert('Delete Document', `Delete "${doc.fileName}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDoc.mutate(doc.id) },
    ])
  }

  // Keypad Handlers
  const handleKeyPress = async (num: string) => {
    if (pinInput.length >= 4) return
    const nextPin = pinInput + num
    setPinInput(nextPin)

    if (nextPin.length === 4) {
      if (passcodeMode === 'enter') {
        const stored = await AsyncStorage.getItem(VAULT_PASSCODE_KEY)
        if (nextPin === stored) {
          setIsUnlocked(true)
          setPinInput('')
          Toast.show({ type: 'success', text1: 'Vault unlocked!' })
        } else {
          Alert.alert('Access Denied', 'Incorrect 4-digit PIN code.', [
            { text: 'Try Again', onPress: () => setPinInput('') }
          ])
        }
      } else if (passcodeMode === 'set') {
        setTempPin(nextPin)
        setPasscodeMode('confirm')
        setPinInput('')
      } else if (passcodeMode === 'confirm') {
        if (nextPin === tempPin) {
          await AsyncStorage.setItem(VAULT_PASSCODE_KEY, nextPin)
          setHasPasscode(true)
          setIsUnlocked(true)
          setPinInput('')
          Toast.show({ type: 'success', text1: 'Secure PIN created!' })
        } else {
          Alert.alert('Mismatched PIN', 'PIN entries did not match. Please restart setup.', [
            { text: 'OK', onPress: () => { setPinInput(''); setPasscodeMode('set'); setTempPin('') } }
          ])
        }
      }
    }
  }

  const handleBackspace = () => {
    setPinInput(pinInput.slice(0, -1))
  }

  const lockVault = () => {
    setIsUnlocked(false)
    setPinInput('')
  }

  const triggerBiometricUnlock = async () => {
    try {
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (!enrolled) {
        Alert.alert(
          'Biometrics Not Setup',
          'Touch ID / Face ID is not enrolled on this device.\n\n• On Phone: Enable lock screen fingerprint/face scan in your system Settings.\n• On iOS Simulator: Choose "Features > Face ID > Enrolled" from the Mac Simulator menu.',
          [{ text: 'OK' }]
        )
        return
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Private Vault',
        fallbackLabel: 'Enter PIN Code',
      })
      
      if (result.success) {
        setIsUnlocked(true)
        setPinInput('')
        Toast.show({ type: 'success', text1: 'Vault unlocked with biometrics!' })
      }
    } catch (error: any) {
      Alert.alert('Biometric Error', error.message || 'Could not complete biometric scan.')
    }
  }

  // Direct Upload Actions (No Naming Modal)
  const handleUploadDocument = async (useCamera: boolean) => {
    try {
      const permissionResult = useCamera 
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync()

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', `Access is required to ${useCamera ? 'capture' : 'select'} files.`)
        return
      }

      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({
            quality: 0.8,
            allowsEditing: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            quality: 0.8,
            allowsEditing: true,
          })

      if (!pickerResult.canceled && pickerResult.assets && pickerResult.assets[0].uri) {
        setUploading(true)
        const fileUri = pickerResult.assets[0].uri
        
        // Extract correct name with extension directly from URI to solve nameless uploads
        const extractedName = fileUri.substring(fileUri.lastIndexOf('/') + 1)
        const finalName = pickerResult.assets[0].fileName || extractedName || `doc_${Date.now()}.jpg`
        const fileType = pickerResult.assets[0].mimeType || 'image/jpeg'

        try {
          await documentsApi.upload(fileUri, finalName, fileType)
          qc.invalidateQueries({ queryKey: ['documents'] })
          qc.invalidateQueries({ queryKey: ['storageSummary'] })
          Toast.show({ type: 'success', text1: 'File secured successfully!' })
        } catch (err: any) {
          const isLimitError = err.message && (err.message.toLowerCase().includes('limit exceeded') || err.message.toLowerCase().includes('storage limit'));
          if (isLimitError) {
            Alert.alert(
              'Storage Limit Exceeded ⚠️',
              'To get more storage access, please take the premium upgrade.',
              [
                { text: 'Close', style: 'cancel' },
                { text: 'Upgrade Now', onPress: () => router.push('/subscriptions') }
              ]
            );
          } else {
            Alert.alert('Upload Failed', err.message || 'Could not upload document.');
          }
        } finally {
          setUploading(false)
        }
      }
    } catch (err) {
      Alert.alert('Error', 'An error occurred during file selection.')
    }
  }

  const showUploadOptions = () => {
    Alert.alert(
      'Secure Document Upload',
      'Select files or snap a receipt photo to encrypt & store in your vault.',
      [
        { text: '📸 Take Photo', onPress: () => handleUploadDocument(true) },
        { text: '🖼️ Pick from Gallery', onPress: () => handleUploadDocument(false) },
        { text: 'Cancel', style: 'cancel' }
      ]
    )
  }

  // Filter Logic (combines type check + extension check)
  const isDocPdfWord = (doc: any) => {
    const type = doc.fileType?.toLowerCase() || ''
    const name = doc.fileName?.toLowerCase() || ''
    return type.includes('pdf') || type.includes('word') || type.includes('docx') || type.includes('xlsx') || type.includes('csv') || type.includes('sheet') ||
      name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')
  }

  const isDocImage = (doc: any) => {
    // If it is explicitly classified as a PDF, Word, Excel, or CSV document, it is NOT an image
    if (isDocPdfWord(doc)) return false
    // Default to image for all other files to guarantee rendering of uploads
    return true
  }

  const filteredDocuments = documents.filter((doc: any) => {
    if (activeTab === 'all') return true
    if (activeTab === 'images') return isDocImage(doc)
    if (activeTab === 'docs') return isDocPdfWord(doc)
    if (activeTab === 'others') {
      return !isDocImage(doc) && !isDocPdfWord(doc)
    }
    return true
  })

  // Lock Screen View
  if (!isUnlocked) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.lockContainer}>
          {/* Header */}
          <TouchableOpacity style={styles.lockBackArrow} onPress={() => router.replace('/(tabs)')}>
            <Text style={{ fontSize: 24, color: colors.ink[900] }}>←</Text>
          </TouchableOpacity>

          <View style={styles.lockHeaderSection}>
            <View style={styles.lockShieldIcon}>
              <Svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke={colors.brand[500]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </Svg>
            </View>
            <Text style={styles.lockTitle}>
              {passcodeMode === 'enter' && 'Private Vault Locked'}
              {passcodeMode === 'set' && 'Create Secure PIN'}
              {passcodeMode === 'confirm' && 'Confirm Secure PIN'}
            </Text>
            <Text style={styles.lockSubtitle}>
              {passcodeMode === 'enter' && 'Enter your 4-digit passcode PIN'}
              {passcodeMode === 'set' && 'Set a 4-digit PIN to encrypt your files'}
              {passcodeMode === 'confirm' && 'Re-enter your 4-digit PIN to confirm'}
            </Text>
          </View>

          {/* PIN Indicators */}
          <View style={styles.pinIndicatorRow}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={[
                  styles.pinDot,
                  pinInput.length > idx && styles.pinDotFilled
                ]}
              />
            ))}
          </View>

          {passcodeMode === 'enter' && useBiometrics && isBiometricSupported && (
            <TouchableOpacity onPress={triggerBiometricUnlock} style={styles.biometricPromptLink}>
              <Text style={styles.biometricPromptLinkText}>Touch / Face ID to Unlock</Text>
            </TouchableOpacity>
          )}

          {/* Numeric Keypad */}
          <View style={styles.keypadGrid}>
            {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
              <View key={rIdx} style={styles.keypadRow}>
                {row.map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.keypadBtn}
                    onPress={() => handleKeyPress(num)}
                  >
                    <Text style={styles.keypadBtnText}>{num}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={styles.keypadRow}>
              {passcodeMode === 'enter' && useBiometrics && isBiometricSupported ? (
                <TouchableOpacity style={[styles.keypadBtn, styles.keypadUtilityBtn]} onPress={triggerBiometricUnlock}>
                  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={colors.brand[500]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 22a10 10 0 0 0 8-16.73M22 12a10 10 0 0 0-19-4.32" />
                    <Path d="M14 14.25a3 3 0 0 0-4 0" />
                    <Path d="M16 11.5a6 6 0 0 0-8 0" />
                    <Path d="M18 8.75a9 9 0 0 0-12 0" />
                    <Path d="M20 6a12 12 0 0 0-16 0" />
                  </Svg>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.keypadBtn, styles.keypadUtilityBtn]} onPress={() => setPinInput('')}>
                  <Text style={styles.keypadUtilityText}>Reset</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.keypadBtn} onPress={() => handleKeyPress('0')}>
                <Text style={styles.keypadBtnText}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.keypadBtn, styles.keypadUtilityBtn]} onPress={handleBackspace}>
                <Text style={styles.keypadUtilityText}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // Private Vault View (Unlocked)
  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Private Vault</Text>
          <TouchableOpacity style={styles.lockTrigger} onPress={lockVault}>
            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.brand[500]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
              <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </Svg>
          </TouchableOpacity>
        </View>
        <Text style={styles.count}>{filteredDocuments.length} file{filteredDocuments.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Storage usage indicator card */}
      {isStorageLoading ? (
        <View style={styles.storageCard}>
          <ActivityIndicator size="small" color={colors.brand[500]} />
        </View>
      ) : storageInfo ? (
        <View style={styles.storageCard}>
          <View style={styles.storageTextRow}>
            <Text style={styles.storageLabel}>Vault Storage</Text>
            <Text style={styles.storageValue}>
              {formatBytes(storageInfo.usedBytes)} of {Math.round(storageInfo.limitBytes / (1024 * 1024 * 1024))} GB used
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  width: `${Math.min(100, (storageInfo.usedBytes / storageInfo.limitBytes) * 100)}%`,
                  backgroundColor: (storageInfo.usedBytes / storageInfo.limitBytes) > 0.8 ? colors.status.error : colors.brand[500]
                }
              ]} 
            />
          </View>
          {!storageInfo.isPremium && (
            <TouchableOpacity 
              style={styles.storageUpgradeBtn}
              onPress={() => router.push('/subscriptions')}
            >
              <Text style={styles.storageUpgradeText}>Upgrade to Premium for more storage</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Security & Privacy trust assurance banner */}
      {isUnlocked && (
        <View style={styles.securityTrustCard}>
          <View style={styles.securityTitleRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.brand[500]} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </Svg>
            <Text style={styles.securityTrustTitle}>Security & Privacy Protected</Text>
          </View>
          <View style={styles.securityBadgesRow}>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>🛡️ AES-256 Encrypted</Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>🤖 Zero AI Access</Text>
            </View>
            <View style={styles.badgeItem}>
              <Text style={styles.badgeLabel}>⏳ Auto-Lock Active</Text>
            </View>
          </View>
        </View>
      )}

      {/* Filter Tabs Row */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'all' && styles.tabButtonActive]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'all' && styles.tabButtonTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'images' && styles.tabButtonActive]}
          onPress={() => setActiveTab('images')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'images' && styles.tabButtonTextActive]}>Photos 🖼️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'docs' && styles.tabButtonActive]}
          onPress={() => setActiveTab('docs')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'docs' && styles.tabButtonTextActive]}>Docs 📄</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'others' && styles.tabButtonActive]}
          onPress={() => setActiveTab('others')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'others' && styles.tabButtonTextActive]}>Others 🗃️</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand[500]} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          key={activeTab === 'images' ? 'grid-3' : 'list'}
          numColumns={activeTab === 'images' ? 3 : 1}
          data={filteredDocuments}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 100 }}
          columnWrapperStyle={activeTab === 'images' ? { gap: Spacing.sm, justifyContent: 'flex-start' } : undefined}
          renderItem={({ item }) => {
            const isImage = isDocImage(item)

            // If active tab is Photos, render as a visual grid card gallery
            if (activeTab === 'images') {
              return (
                <View style={styles.gridCard}>
                  <TouchableOpacity
                    style={styles.gridCardTouch}
                    onPress={() => {
                      setPreviewImageId(item.id)
                      setPreviewImageName(item.fileName)
                    }}
                  >
                    {authToken ? (
                      <Image
                        source={{
                          uri: documentsApi.downloadUrl(item.id),
                          headers: { Authorization: `Bearer ${authToken}` }
                        }}
                        style={styles.gridImg}
                        contentFit="cover"
                      />
                    ) : (
                      <ActivityIndicator size="small" color={colors.brand[500]} />
                    )}
                    
                    {/* Delete action overlay button */}
                    <TouchableOpacity 
                      style={styles.gridDeleteBtn} 
                      onPress={() => handleDelete(item)}
                    >
                      <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                        <Line x1={18} y1={6} x2={6} y2={18} />
                        <Line x1={6} y1={6} x2={18} y2={18} />
                      </Svg>
                    </TouchableOpacity>

                    {/* Metadata Overlay info */}
                    <View style={styles.gridMetaOverlay}>
                      <Text style={styles.gridMetaText} numberOfLines={1}>{item.fileName}</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )
            }

            // Standard List row for Docs, Others and All
            return (
              <View style={styles.docCard}>
                <TouchableOpacity
                  style={styles.docLeft}
                  onPress={() => {
                    if (isImage) {
                      setPreviewImageId(item.id)
                      setPreviewImageName(item.fileName)
                    } else {
                      handleDownload(item)
                    }
                  }}
                >
                  <View style={styles.iconBlock}>
                    {isImage && authToken ? (
                      <Image
                        source={{
                          uri: documentsApi.downloadUrl(item.id),
                          headers: { Authorization: `Bearer ${authToken}` }
                        }}
                        style={styles.thumbnailImg}
                        contentFit="cover"
                      />
                    ) : (
                      <Text style={{ fontSize: 20 }}>{fileEmoji(item.fileType)}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docName} numberOfLines={1}>{item.fileName}</Text>
                    <Text style={styles.docMeta}>
                      {formatBytes(item.fileSize)} • {isImage ? '🖼️ Photo' : item.scanned ? '✅ Scanned' : '📄 Document'}
                    </Text>
                    <Text style={styles.docDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(item)}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.brand[600]} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <Path d="M7 10l5 5 5-5" />
                      <Line x1={12} y1={15} x2={12} y2={3} />
                    </Svg>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)}>
                    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={colors.status.error} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                      <Path d="M3 6h18" />
                      <Path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <Line x1={10} y1={11} x2={10} y2={17} />
                      <Line x1={14} y1={11} x2={14} y2={17} />
                    </Svg>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyShieldIcon}>
                <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke={colors.ink[300]} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <Rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
                  <Path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </Svg>
              </View>
              <Text style={styles.emptyTitle}>No files found</Text>
              <Text style={styles.emptyDesc}>
                {activeTab === 'all' 
                  ? 'Tap the upload button below to encrypt and secure important documents, bills, or photo receipts.'
                  : `You don't have any files under the "${activeTab}" category yet.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Upload Action Button */}
      <TouchableOpacity style={styles.floatingUploadBtn} onPress={showUploadOptions} disabled={uploading}>
        {uploading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <Line x1={12} y1={5} x2={12} y2={19} />
            <Line x1={5} y1={12} x2={19} y2={12} />
          </Svg>
        )}
      </TouchableOpacity>

      {/* Fullscreen Image Preview Lightbox Modal */}
      <Modal
        visible={!!previewImageId}
        transparent={false}
        animationType="fade"
        onRequestClose={() => setPreviewImageId(null)}
      >
        <SafeAreaView style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <View style={{ flex: 1, paddingRight: Spacing.md }}>
              <Text style={styles.previewTitle} numberOfLines={1}>{previewImageName}</Text>
            </View>
            <TouchableOpacity style={styles.previewCloseBtn} onPress={() => setPreviewImageId(null)}>
              <Text style={styles.previewCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.previewBody}>
            {previewImageId && authToken && (
              <Image
                source={{
                  uri: documentsApi.downloadUrl(previewImageId),
                  headers: { Authorization: `Bearer ${authToken}` }
                }}
                style={styles.previewImg}
                contentFit="contain"
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const useStyles = makeStyles((colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface.soft },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingBottom: Spacing.xs,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  backArrow: { fontSize: 22, color: colors.ink[900], paddingRight: 4 },
  title: { fontSize: FontSize.xl, fontWeight: '800', color: colors.ink[900] },
  lockTrigger: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.xs,
  },
  count: { fontSize: FontSize.sm, color: colors.ink[500], fontWeight: '600' },

  // Security Trust Card styles
  securityTrustCard: {
    backgroundColor: colors.surface.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    ...Shadow.sm,
  },
  securityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  securityTrustTitle: {
    fontSize: FontSize.xs,
    fontWeight: '800',
    color: colors.ink[700],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  securityBadgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: Spacing.xs,
  },
  badgeItem: {
    alignItems: 'center',
    backgroundColor: colors.surface.soft,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    flex: 1,
  },
  badgeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.ink[500],
    textAlign: 'center',
  },

  // Storage Card styles
  storageCard: {
    backgroundColor: colors.surface.white,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    ...Shadow.sm,
  },
  storageTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  storageLabel: {
    fontSize: FontSize.xs + 1,
    fontWeight: '700',
    color: colors.ink[900],
  },
  storageValue: {
    fontSize: FontSize.xs,
    color: colors.ink[500],
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surface.soft,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  storageUpgradeBtn: {
    marginTop: Spacing.xs + 2,
    alignItems: 'center',
  },
  storageUpgradeText: {
    fontSize: FontSize.xs,
    color: colors.brand[500],
    fontWeight: '700',
    textDecorationLine: 'underline',
  },

  // Filter Tabs Styling
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  tabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  tabButtonActive: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[600],
  },
  tabButtonText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: colors.ink[500],
  },
  tabButtonTextActive: {
    color: '#fff',
  },

  // Document List Row styling
  docCard: {
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.surface.border,
    width: '100%',
    ...Shadow.sm,
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBlock: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: 44,
    height: 44,
  },
  docName: { fontSize: FontSize.md, fontWeight: '600', color: colors.ink[900], fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  docMeta: { fontSize: FontSize.xs, color: colors.ink[500], marginTop: 2, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  docDate: { fontSize: FontSize.xs, color: colors.ink[400], marginTop: 1, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    backgroundColor: colors.surface.soft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.surface.border,
  },
  deleteBtn: { backgroundColor: colors.status.error + '10', borderColor: colors.status.error + '20' },

  // Visual Photos Grid Layout styling
  gridCard: {
    flex: 1,
    maxWidth: '31.3%',
    backgroundColor: colors.surface.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: colors.surface.border,
    overflow: 'hidden',
    aspectRatio: 1,
    marginBottom: Spacing.sm,
    ...Shadow.sm,
  },
  gridCardTouch: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  gridImg: {
    width: '100%',
    height: '100%',
  },
  gridDeleteBtn: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gridMetaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  gridMetaText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: Spacing.xl },
  emptyShieldIcon: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.surface.white,
    borderWidth: 1.5,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadow.sm,
  },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '800', color: colors.ink[900], marginBottom: Spacing.sm, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium' },
  emptyDesc: { fontSize: FontSize.sm, color: colors.ink[500], textAlign: 'center', lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif' },

  // Passcode Lock Screen specific styles
  lockContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface.soft,
  },
  lockBackArrow: {
    alignSelf: 'flex-start',
    padding: Spacing.md,
    marginLeft: -Spacing.md,
  },
  lockHeaderSection: {
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  lockShieldIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderColor: colors.brand[100],
    ...Shadow.sm,
  },
  lockTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: colors.ink[900],
    marginBottom: Spacing.xs,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  lockSubtitle: {
    fontSize: FontSize.sm,
    color: colors.ink[500],
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  pinIndicatorRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    justifyContent: 'center',
    marginBottom: 40,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.ink[300],
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: colors.brand[500],
    borderColor: colors.brand[500],
  },
  biometricPromptLink: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  biometricPromptLinkText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.brand[500],
  },
  keypadGrid: {
    width: '100%',
    maxWidth: 280,
    gap: Spacing.md,
  },
  keypadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  keypadBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface.white,
    borderWidth: 1,
    borderColor: colors.surface.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.sm,
  },
  keypadBtnText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: colors.ink[900],
  },
  keypadUtilityBtn: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },
  keypadUtilityText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: colors.ink[500],
  },

  // Floating upload action button
  floatingUploadBtn: {
    position: 'absolute',
    bottom: Spacing.xl + 10,
    right: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadow.md,
  },

  // Lightbox Preview Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  previewTitle: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  previewCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  previewBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  previewImg: {
    width: '100%',
    height: '100%',
  },
}))
