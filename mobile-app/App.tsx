import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
  Platform,
  PanResponder,
  NativeModules
} from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Safe dynamic require for SMS User Consent to prevent crash in Expo Go
let useSmsUserConsentHook = (digits: number): string => '';
if (Platform.OS === 'android' && NativeModules.ReactNativeSmsUserConsent) {
  try {
    useSmsUserConsentHook = require('@eabdullazyanov/react-native-sms-user-consent').useSmsUserConsent;
  } catch (err) {
    console.warn('Failed to load SMS user consent module:', err);
  }
}

// Device Dimensions
const { width } = Dimensions.get('window');

// Data Types
interface Customer {
  id: string;
  name: string;
  mobile: string;
  whatsapp: string;
  email: string;
  companyName: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

interface SurveyWork {
  id: string;
  workNumber: string;
  workDate: string;
  workType: string;
  siteLocation: string;
  customerId: string;
  customerName: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'BILLED' | 'PAID';
  assignedStaff: string;
  remarks?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerId: string;
  customerName: string;
  whatsapp: string;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  dueDate: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paymentLink: string;
  surveyWorkNumber?: string;
}

interface ReminderLog {
  id: string;
  invoiceNumber: string;
  customerName: string;
  type: string;
  sentDate: string;
  deliveryStatus: 'SENT' | 'FAILED';
  triggeredBy: 'SYSTEM' | 'STAFF';
}

export default function App() {
  // Navigation Router state: 'Login', 'Dashboard', 'Customers', 'AddCustomer', 'SurveyWorks', 'CreateWork', 'Invoices', 'CreateInvoice', 'FollowUpDetail', 'ReminderHistory', 'Reports', 'Settings'
  const [currentScreen, setCurrentScreen] = useState<string>('Login');
  const [userRole, setUserRole] = useState<'SUPER_ADMIN' | 'TENANT_ADMIN' | 'STAFF'>('TENANT_ADMIN');
  const [userName, setUserName] = useState<string>('Karthik Raja (Admin)');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Mobile OTP Auth State
  const [loginMobile, setLoginMobile] = useState('');
  const [loginOtp, setLoginOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');

  // SMS OTP Auto-retrieval (Android User Consent API)
  const retrievedCode = useSmsUserConsentHook(6);

  React.useEffect(() => {
    if (retrievedCode && retrievedCode.length === 6 && otpSent) {
      setLoginOtp(retrievedCode);
      verifyOtpRequest(retrievedCode);
    }
  }, [retrievedCode, otpSent]);

  // Swipe Navigation Gestures
  const TABS = ['Dashboard', 'Customers', 'SurveyWorks', 'Invoices', 'Settings'];

  const handleSwipe = (direction: 'LEFT' | 'RIGHT') => {
    const currentIndex = TABS.indexOf(currentScreen);
    if (currentIndex === -1) return;

    if (direction === 'LEFT') {
      // Next tab (finger swipes left, content shifts left, screen moves right)
      if (currentIndex < TABS.length - 1) {
        setCurrentScreen(TABS[currentIndex + 1]);
      }
    } else if (direction === 'RIGHT') {
      // Previous tab (finger swipes right, content shifts right, screen moves left)
      if (currentIndex > 0) {
        setCurrentScreen(TABS[currentIndex - 1]);
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Intercept touches if horizontal movement is dominant and significant
        return (
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 2.5 &&
          Math.abs(gestureState.dx) > 30
        );
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dx < -50) {
          handleSwipe('LEFT');
        } else if (gestureState.dx > 50) {
          handleSwipe('RIGHT');
        }
      },
    })
  ).current;

  // Core Data States
  const [customers, setCustomers] = useState<Customer[]>([
    { id: '1', name: 'Apex Infrastructure Ltd', mobile: '9876543210', whatsapp: '9876543210', email: 'billing@apexinfra.com', companyName: 'Apex Infrastructure Ltd', address: 'Plot 45, Sector 12, Tech Park, Chennai', gstNumber: '33AAAAA1111A1Z1', notes: 'Frequent customer for topography layouts' },
    { id: '2', name: 'Greenwood Builders', mobile: '9876543211', whatsapp: '9876543211', email: 'accounts@greenwood.in', companyName: 'Greenwood Builders', address: 'OMR Road, Sholinganallur, Chennai', gstNumber: '33BBBBB2222B2Z2', notes: 'Payment terms: Net 15' },
    { id: '3', name: 'Vertex Land Developers', mobile: '9876543212', whatsapp: '9876543212', email: 'vertex@gmail.com', companyName: 'Vertex Land Developers', address: 'Guindy, Chennai', gstNumber: '' }
  ]);

  const [surveyWorks, setSurveyWorks] = useState<SurveyWork[]>([
    { id: 'w1', workNumber: 'SURV-20260621-0001', workDate: '2026-06-21', workType: 'Topographical Survey', siteLocation: 'Guindy Industrial Estate, Chennai', customerId: '1', customerName: 'Apex Infrastructure Ltd', status: 'NEW', assignedStaff: 'Karthik Raja' },
    { id: 'w2', workNumber: 'SURV-20260619-0002', workDate: '2026-06-19', workType: 'Boundary Demarcation', siteLocation: 'OMR Road, Sholinganallur, Chennai', customerId: '2', customerName: 'Greenwood Builders', status: 'IN_PROGRESS', assignedStaff: 'Srinivasan M' },
    { id: 'w3', workNumber: 'SURV-20260615-0003', workDate: '2026-06-15', workType: 'Drone Mapping', siteLocation: 'Guindy, Chennai', customerId: '3', customerName: 'Vertex Land Developers', status: 'COMPLETED', assignedStaff: 'Karthik Raja' }
  ]);

  const [invoices, setInvoices] = useState<Invoice[]>([
    { id: 'i1', invoiceNumber: 'INV-20260621-0001', invoiceDate: '2026-06-21', customerId: '1', customerName: 'Apex Infrastructure Ltd', whatsapp: '9876543210', amount: 45000, gstAmount: 8100, totalAmount: 53100, dueDate: '2026-06-28', status: 'PENDING', paymentLink: 'https://rzp.io/i/plink_982x', surveyWorkNumber: 'SURV-20260612-0004' },
    { id: 'i2', invoiceNumber: 'INV-20260615-0002', invoiceDate: '2026-06-15', customerId: '2', customerName: 'Greenwood Builders', whatsapp: '9876543211', amount: 30000, gstAmount: 5400, totalAmount: 35400, dueDate: '2026-06-20', status: 'OVERDUE', paymentLink: 'https://rzp.io/i/plink_812y' }
  ]);

  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([
    { id: 'r1', invoiceNumber: 'INV-20260621-0001', customerName: 'Apex Infrastructure Ltd', type: 'PAYMENT_REQUEST', sentDate: '2026-06-21 10:15', deliveryStatus: 'SENT', triggeredBy: 'STAFF' },
    { id: 'r2', invoiceNumber: 'INV-20260615-0002', customerName: 'Greenwood Builders', type: 'GENTLE_REMINDER', sentDate: '2026-06-16 09:00', deliveryStatus: 'SENT', triggeredBy: 'SYSTEM' }
  ]);

  // Form Fields State
  const [custName, setCustName] = useState('');
  const [custMobile, setCustMobile] = useState('');
  const [custWA, setCustWA] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custCompany, setCustCompany] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custGST, setCustGST] = useState('');
  const [custNotes, setCustNotes] = useState('');

  const [workDate, setWorkDate] = useState('2026-06-21');
  const [workType, setWorkType] = useState('Topographical Survey');
  const [workLocation, setWorkLocation] = useState('');
  const [workCustId, setWorkCustId] = useState('');
  const [workStaff, setWorkStaff] = useState('');
  const [workRemarks, setWorkRemarks] = useState('');

  const [invDate, setInvDate] = useState('2026-06-21');
  const [invDueDate, setInvDueDate] = useState('2026-06-28');
  const [invCustId, setInvCustId] = useState('');
  const [invWorkId, setInvWorkId] = useState('');
  const [invAmount, setInvAmount] = useState('');

  const [searchVal, setSearchVal] = useState('');

  const API_URL = 'http://localhost:3001/api';

  const sendOtpRequest = async () => {
    if (!loginMobile) {
      Alert.alert('Error', 'Please enter your mobile number.');
      return;
    }
    setLoginLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: loginMobile }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      setOtpSent(true);
      Alert.alert('Success', 'Verification code sent!');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong while sending OTP.');
    } finally {
      setLoginLoading(false);
    }
  };

  const verifyOtpRequest = async (otpValue?: string) => {
    const otpToVerify = otpValue || loginOtp;
    if (!otpToVerify) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }
    setLoginLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber: loginMobile, otp: otpToVerify }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      setAuthToken(data.token);
      setUserRole(data.user.role);
      setUserName(`${data.user.name} (${data.user.role === 'TENANT_ADMIN' ? 'Admin' : 'Staff'})`);
      setCurrentScreen('Dashboard');
      // Reset form states
      setLoginMobile('');
      setLoginOtp('');
      setOtpSent(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  const logoutThisDevice = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/auth/logout-device`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });
      }
    } catch (e) {
      console.warn('Logout device api error:', e);
    } finally {
      setAuthToken('');
      setCurrentScreen('Login');
    }
  };

  const logoutAllDevices = async () => {
    try {
      if (authToken) {
        await fetch(`${API_URL}/auth/logout-all`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        });
      }
    } catch (e) {
      console.warn('Logout all api error:', e);
    } finally {
      setAuthToken('');
      setCurrentScreen('Login');
    }
  };

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out Options',
      'Select how you want to sign out of your account:',
      [
        { text: 'Logout This Device', onPress: logoutThisDevice },
        { text: 'Logout All Devices', onPress: logoutAllDevices, style: 'destructive' },
        { text: 'Cancel', style: 'cancel' }
      ],
      { cancelable: true }
    );
  };

  // Create Actions
  const addCustomerRecord = () => {
    if (!custName || !custMobile || !custWA) {
      Alert.alert('Error', 'Name, mobile, and WhatsApp numbers are required.');
      return;
    }
    const newCust: Customer = {
      id: `c_${Date.now()}`,
      name: custName,
      mobile: custMobile,
      whatsapp: custWA,
      email: custEmail,
      companyName: custCompany || custName,
      address: custAddress,
      gstNumber: custGST,
      notes: custNotes
    };
    setCustomers([newCust, ...customers]);
    Alert.alert('Success', 'Customer profile registered successfully.');
    // Reset
    setCustName(''); setCustMobile(''); setCustWA(''); setCustEmail(''); setCustCompany(''); setCustAddress(''); setCustGST(''); setCustNotes('');
    setCurrentScreen('Customers');
  };

  const createWorkOrder = () => {
    if (!workLocation || !workCustId) {
      Alert.alert('Error', 'Site location and customer selection are required.');
      return;
    }
    const selected = customers.find(c => c.id === workCustId);
    const newWork: SurveyWork = {
      id: `w_${Date.now()}`,
      workNumber: `SURV-20260621-${Math.floor(1000 + Math.random() * 9000)}`,
      workDate,
      workType,
      siteLocation: workLocation,
      customerId: workCustId,
      customerName: selected ? selected.name : 'Unknown Client',
      status: 'NEW',
      assignedStaff: workStaff || 'Unassigned',
      remarks: workRemarks
    };
    setSurveyWorks([newWork, ...surveyWorks]);
    Alert.alert('Success', 'Survey Work Order created.');
    setWorkLocation(''); setWorkRemarks('');
    setCurrentScreen('SurveyWorks');
  };

  const createBillingInvoice = () => {
    if (!invCustId || !invAmount) {
      Alert.alert('Error', 'Customer selection and billing amount are required.');
      return;
    }
    const selected = customers.find(c => c.id === invCustId);
    const linkedWork = surveyWorks.find(w => w.id === invWorkId);

    const baseAmount = Number(invAmount);
    const gst = baseAmount * 0.18;
    const total = baseAmount + gst;

    const newInv: Invoice = {
      id: `i_${Date.now()}`,
      invoiceNumber: `INV-20260621-${Math.floor(1000 + Math.random() * 9000)}`,
      invoiceDate: invDate,
      customerId: invCustId,
      customerName: selected ? selected.name : 'Unknown Client',
      whatsapp: selected ? selected.whatsapp : '9876543210',
      amount: baseAmount,
      gstAmount: gst,
      totalAmount: total,
      dueDate: invDueDate,
      status: 'PENDING',
      paymentLink: 'https://rzp.io/i/plink_mock_' + Math.floor(Math.random() * 1000),
      surveyWorkNumber: linkedWork ? linkedWork.workNumber : undefined
    };

    setInvoices([newInv, ...invoices]);

    // Update survey work status to BILLED
    if (invWorkId) {
      setSurveyWorks(surveyWorks.map(w => w.id === invWorkId ? { ...w, status: 'BILLED' } : w));
    }

    // Append automated request log
    const newLog: ReminderLog = {
      id: `l_${Date.now()}`,
      invoiceNumber: newInv.invoiceNumber,
      customerName: newInv.customerName,
      type: 'PAYMENT_REQUEST',
      sentDate: '2026-06-21 21:00',
      deliveryStatus: 'SENT',
      triggeredBy: 'STAFF'
    };
    setReminderLogs([newLog, ...reminderLogs]);

    Alert.alert('Success', 'Invoice raised! Stage 1 payment link dispatched via WhatsApp.');
    setInvAmount('');
    setCurrentScreen('Invoices');
  };

  const triggerManualWhatsApp = (inv: Invoice, type: string) => {
    const newLog: ReminderLog = {
      id: `l_${Date.now()}`,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      type: type,
      sentDate: '2026-06-21 21:05',
      deliveryStatus: 'SENT',
      triggeredBy: 'STAFF'
    };
    setReminderLogs([newLog, ...reminderLogs]);
    Alert.alert('Success', `${type} notification sent to ${inv.customerName} (+${inv.whatsapp})`);
  };

  const simulatePaymentReceived = (inv: Invoice) => {
    setInvoices(invoices.map(i => i.id === inv.id ? { ...i, status: 'PAID' } : i));

    // update linked survey work to paid
    if (inv.surveyWorkNumber) {
      setSurveyWorks(surveyWorks.map(w => w.workNumber === inv.surveyWorkNumber ? { ...w, status: 'PAID' } : w));
    }

    const newLog: ReminderLog = {
      id: `l_${Date.now()}`,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      type: 'PAYMENT_RECEIVED',
      sentDate: '2026-06-21 21:08',
      deliveryStatus: 'SENT',
      triggeredBy: 'SYSTEM'
    };
    setReminderLogs([newLog, ...reminderLogs]);
    Alert.alert('Payment Received', `Webhook matched. Invoice #${inv.invoiceNumber} status set to PAID.`);
  };

  // Rendering screen components
  const renderHeader = (title: string, backTo?: string) => (
    <View style={styles.header}>
      {backTo ? (
        <TouchableOpacity style={styles.backButton} onPress={() => setCurrentScreen(backTo)}>
          <Text style={styles.backText}>&larr; Back</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>SAJ</Text>
        </View>
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 60 }} />
    </View>
  );

  const renderFooter = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity style={[styles.tabItem, currentScreen === 'Dashboard' && styles.tabItemActive]} onPress={() => setCurrentScreen('Dashboard')}>
        <Text style={[styles.tabText, currentScreen === 'Dashboard' && styles.tabTextActive]}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, currentScreen === 'Customers' && styles.tabItemActive]} onPress={() => setCurrentScreen('Customers')}>
        <Text style={[styles.tabText, currentScreen === 'Customers' && styles.tabTextActive]}>Clients</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, currentScreen === 'SurveyWorks' && styles.tabItemActive]} onPress={() => setCurrentScreen('SurveyWorks')}>
        <Text style={[styles.tabText, currentScreen === 'SurveyWorks' && styles.tabTextActive]}>Surveys</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, currentScreen === 'Invoices' && styles.tabItemActive]} onPress={() => setCurrentScreen('Invoices')}>
        <Text style={[styles.tabText, currentScreen === 'Invoices' && styles.tabTextActive]}>Bills</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.tabItem, currentScreen === 'Settings' && styles.tabItemActive]} onPress={() => setCurrentScreen('Settings')}>
        <Text style={[styles.tabText, currentScreen === 'Settings' && styles.tabTextActive]}>Admin</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={{ flex: 1 }}
        {...(TABS.includes(currentScreen) ? panResponder.panHandlers : {})}
      >
        {/* LOGIN SCREEN */}
        {currentScreen === 'Login' && (
          <ScrollView contentContainerStyle={styles.loginContainer}>
            <View style={{ flex: 1, justifyContent: 'center', width: '100%', alignItems: 'center', marginTop: -45 }}>
              <View style={styles.loginCard}>
                <View style={styles.loginLogoContainer}>
                  <View style={styles.loginLogoIcon}>
                    <Text style={styles.logoText}>SAJ</Text>
                  </View>
                  <Text style={styles.loginLogoTitle}>SAJ Payments</Text>
                  <Text style={styles.loginSubtitle}>Billing Follow-up & Collections</Text>
                </View>

                <View style={styles.formContainer}>
                  {!otpSent ? (
                    <>
                      <Text style={styles.inputLabel}>MOBILE NUMBER</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. +919876543210"
                        placeholderTextColor="#64748b"
                        keyboardType="phone-pad"
                        value={loginMobile}
                        onChangeText={setLoginMobile}
                        editable={!loginLoading}
                      />

                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={sendOtpRequest}
                        disabled={loginLoading}
                      >
                        {loginLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Send OTP</Text>
                        )}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ color: '#94a3b8', fontSize: 12 }}>Sending to: {loginMobile}</Text>
                        <TouchableOpacity onPress={() => setOtpSent(false)}>
                          <Text style={{ color: '#a5b4fc', fontSize: 12, fontWeight: 'bold' }}>Edit</Text>
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.inputLabel}>ENTER 6-DIGIT OTP</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="••••••"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={loginOtp}
                        onChangeText={(val) => {
                          setLoginOtp(val);
                          if (val.length === 6) {
                            verifyOtpRequest(val);
                          }
                        }}
                        editable={!loginLoading}
                        textContentType="oneTimeCode"
                        autoComplete="sms-otp"
                      />

                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => verifyOtpRequest()}
                        disabled={loginLoading}
                      >
                        {loginLoading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.primaryButtonText}>Verify & Login</Text>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={sendOtpRequest}
                        disabled={loginLoading}
                      >
                        <Text style={styles.secondaryButtonText}>Resend OTP</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            </View>
            <View style={styles.loginFooter}>
              <Text style={styles.loginFooterText}>Developed & Powered by</Text>
              <Text style={[styles.loginFooterText, { fontWeight: '600', marginTop: 2 }]}>SAJ Technologies Pvt Ltd</Text>
            </View>
          </ScrollView>
        )}

        {/* DASHBOARD SCREEN */}
        {currentScreen === 'Dashboard' && (
          <View style={{ flex: 1 }}>
            {renderHeader('SAJ Dashboard')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.welcomeBanner}>
                <Text style={styles.welcomeTitle}>Welcome back,</Text>
                <Text style={styles.welcomeName}>{userName}</Text>
              </View>

              {/* Stats Row */}
              <View style={styles.statsRow}>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>COLLECTED</Text>
                  <Text style={[styles.statsValue, { color: '#10b981' }]}>₹5.8L</Text>
                </View>
                <View style={styles.statsCard}>
                  <Text style={styles.statsLabel}>OUTSTANDING</Text>
                  <Text style={[styles.statsValue, { color: '#f59e0b' }]}>₹3.05L</Text>
                </View>
              </View>

              {/* Action grid shortcuts */}
              <Text style={styles.sectionHeader}>Quick Actions</Text>
              <View style={styles.actionGrid}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setCurrentScreen('AddCustomer')}>
                  <Text style={styles.actionBtnText}>+ Client</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => setCurrentScreen('CreateWork')}>
                  <Text style={styles.actionBtnText}>+ Survey</Text>
                </TouchableOpacity>
                {userRole === 'TENANT_ADMIN' && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setCurrentScreen('CreateInvoice')}>
                    <Text style={styles.actionBtnText}>+ Bill</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.actionBtn} onPress={() => setCurrentScreen('Reports')}>
                  <Text style={styles.actionBtnText}>Aging Summary</Text>
                </TouchableOpacity>
              </View>

              {/* Recent Active Reminders */}
              <Text style={styles.sectionHeader}>Recent Reminders</Text>
              {reminderLogs.slice(0, 3).map((log) => (
                <View key={log.id} style={styles.historyCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>{log.customerName}</Text>
                    <Text style={{ fontSize: 11, color: '#06b6d4', fontWeight: 'bold' }}>{log.type}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>Inv: {log.invoiceNumber}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>{log.sentDate}</Text>
                  </View>
                </View>
              ))}

              <TouchableOpacity style={styles.linkRow} onPress={() => setCurrentScreen('ReminderHistory')}>
                <Text style={styles.linkRowText}>View All Reminder Logs &rarr;</Text>
              </TouchableOpacity>
              <View style={{ height: 30 }} />
            </ScrollView>
            {renderFooter()}
          </View>
        )}

        {/* CUSTOMERS SCREEN */}
        {currentScreen === 'Customers' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Customers')}
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search customers..."
                placeholderTextColor="#64748b"
                value={searchVal}
                onChangeText={setSearchVal}
              />
              <TouchableOpacity style={styles.addButtonIcon} onPress={() => setCurrentScreen('AddCustomer')}>
                <Text style={{ color: '#fff', fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.scrollBody}>
              {customers
                .filter(c => c.name.toLowerCase().includes(searchVal.toLowerCase()))
                .map((c) => (
                  <View key={c.id} style={styles.listCard}>
                    <Text style={styles.cardName}>{c.name}</Text>
                    <Text style={styles.cardDetail}>Company: {c.companyName}</Text>
                    <Text style={styles.cardDetail}>Phone/WA: {c.whatsapp}</Text>
                    {c.gstNumber ? <Text style={styles.cardDetail}>GST: {c.gstNumber}</Text> : null}
                  </View>
                ))}
              <View style={{ height: 30 }} />
            </ScrollView>
            {renderFooter()}
          </View>
        )}

        {/* ADD CUSTOMER SCREEN */}
        {currentScreen === 'AddCustomer' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Add Customer', 'Customers')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>FULL NAME *</Text>
                <TextInput style={styles.input} placeholder="e.g. Ramesh Kumar" placeholderTextColor="#64748b" value={custName} onChangeText={setCustName} />

                <Text style={styles.inputLabel}>MOBILE NUMBER *</Text>
                <TextInput style={styles.input} placeholder="e.g. 9876543210" keyboardType="numeric" placeholderTextColor="#64748b" value={custMobile} onChangeText={setCustMobile} />

                <Text style={styles.inputLabel}>WHATSAPP NUMBER *</Text>
                <TextInput style={styles.input} placeholder="Include country code (e.g. 91...)" keyboardType="numeric" placeholderTextColor="#64748b" value={custWA} onChangeText={setCustWA} />

                <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
                <TextInput style={styles.input} placeholder="email@company.com" placeholderTextColor="#64748b" value={custEmail} onChangeText={setCustEmail} />

                <Text style={styles.inputLabel}>COMPANY NAME</Text>
                <TextInput style={styles.input} placeholder="Apex Builders" placeholderTextColor="#64748b" value={custCompany} onChangeText={setCustCompany} />

                <Text style={styles.inputLabel}>GSTIN</Text>
                <TextInput style={styles.input} placeholder="15-digit GSTIN" placeholderTextColor="#64748b" value={custGST} onChangeText={setCustGST} />

                <Text style={styles.inputLabel}>BILLING ADDRESS</Text>
                <TextInput style={styles.input} placeholder="Postal address..." placeholderTextColor="#64748b" value={custAddress} onChangeText={setCustAddress} />

                <Text style={styles.inputLabel}>PRIVATE REMARKS</Text>
                <TextInput style={styles.input} placeholder="Terms, contacts, notes" placeholderTextColor="#64748b" value={custNotes} onChangeText={setCustNotes} />

                <TouchableOpacity style={styles.primaryButton} onPress={addCustomerRecord}>
                  <Text style={styles.primaryButtonText}>Save Profile</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* SURVEY WORKS SCREEN */}
        {currentScreen === 'SurveyWorks' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Survey Works')}
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search works..."
                placeholderTextColor="#64748b"
                value={searchVal}
                onChangeText={setSearchVal}
              />
              <TouchableOpacity style={styles.addButtonIcon} onPress={() => setCurrentScreen('CreateWork')}>
                <Text style={{ color: '#fff', fontSize: 18 }}>+</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.scrollBody}>
              {surveyWorks
                .filter(w => w.workNumber.toLowerCase().includes(searchVal.toLowerCase()) || w.customerName.toLowerCase().includes(searchVal.toLowerCase()))
                .map((w) => (
                  <View key={w.id} style={styles.listCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#06b6d4', fontWeight: 'bold' }}>{w.workNumber}</Text>
                      <View style={[styles.badge, w.status === 'NEW' ? styles.badgePrimary : styles.badgeSuccess]}>
                        <Text style={styles.badgeText}>{w.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardName}>{w.customerName}</Text>
                    <Text style={styles.cardDetail}>Type: {w.workType}</Text>
                    <Text style={styles.cardDetail}>Loc: {w.siteLocation}</Text>
                    <Text style={styles.cardDetail}>Staff: {w.assignedStaff}</Text>

                    {w.status === 'NEW' && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { marginTop: 8 }]}
                        onPress={() => {
                          setSurveyWorks(surveyWorks.map(sw => sw.id === w.id ? { ...sw, status: 'IN_PROGRESS' } : sw));
                          Alert.alert('Status Updated', 'Survey set to IN_PROGRESS');
                        }}
                      >
                        <Text style={styles.smallBtnText}>Start Operations</Text>
                      </TouchableOpacity>
                    )}

                    {w.status === 'IN_PROGRESS' && (
                      <TouchableOpacity
                        style={[styles.smallBtn, { marginTop: 8, backgroundColor: '#10b981' }]}
                        onPress={() => {
                          setSurveyWorks(surveyWorks.map(sw => sw.id === w.id ? { ...sw, status: 'COMPLETED' } : sw));
                          Alert.alert('Completed', 'Survey coordinates finalized.');
                        }}
                      >
                        <Text style={styles.smallBtnText}>Mark Completed</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              <View style={{ height: 30 }} />
            </ScrollView>
            {renderFooter()}
          </View>
        )}

        {/* CREATE WORK SCREEN */}
        {currentScreen === 'CreateWork' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Create Job Sheet', 'SurveyWorks')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>CHOOSE CUSTOMER *</Text>
                <View style={styles.pickerWrapper}>
                  {customers.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.pickerItem, workCustId === c.id && styles.pickerItemActive]}
                      onPress={() => setWorkCustId(c.id)}
                    >
                      <Text style={{ color: '#fff', fontSize: 13 }}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>WORK DATE</Text>
                <TextInput style={styles.input} value={workDate} onChangeText={setWorkDate} />

                <Text style={styles.inputLabel}>SURVEYING CATEGORY</Text>
                <TextInput style={styles.input} placeholder="e.g. Drone Mapping, GPS points" placeholderTextColor="#64748b" value={workType} onChangeText={setWorkType} />

                <Text style={styles.inputLabel}>SITE LOCATION *</Text>
                <TextInput style={styles.input} placeholder="e.g. Village blocks, Guindy" placeholderTextColor="#64748b" value={workLocation} onChangeText={setWorkLocation} />

                <Text style={styles.inputLabel}>ASSIGN STAFF</Text>
                <TextInput style={styles.input} placeholder="Srinivasan M" placeholderTextColor="#64748b" value={workStaff} onChangeText={setWorkStaff} />

                <Text style={styles.inputLabel}>INSTRUCTIONS</Text>
                <TextInput style={styles.input} placeholder="Equipments needed..." placeholderTextColor="#64748b" value={workRemarks} onChangeText={setWorkRemarks} />

                <TouchableOpacity style={styles.primaryButton} onPress={createWorkOrder}>
                  <Text style={styles.primaryButtonText}>Launch Work Order</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* INVOICES SCREEN */}
        {currentScreen === 'Invoices' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Invoices')}
            <View style={styles.searchBarContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search bills..."
                placeholderTextColor="#64748b"
                value={searchVal}
                onChangeText={setSearchVal}
              />
              {userRole === 'TENANT_ADMIN' && (
                <TouchableOpacity style={styles.addButtonIcon} onPress={() => setCurrentScreen('CreateInvoice')}>
                  <Text style={{ color: '#fff', fontSize: 18 }}>+</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.scrollBody}>
              {invoices
                .filter(i => i.invoiceNumber.toLowerCase().includes(searchVal.toLowerCase()) || i.customerName.toLowerCase().includes(searchVal.toLowerCase()))
                .map((i) => (
                  <View key={i.id} style={styles.listCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#06b6d4', fontWeight: 'bold' }}>{i.invoiceNumber}</Text>
                      <View style={[styles.badge, i.status === 'PAID' ? styles.badgeSuccess : styles.badgeDanger]}>
                        <Text style={styles.badgeText}>{i.status}</Text>
                      </View>
                    </View>
                    <Text style={styles.cardName}>{i.customerName}</Text>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#fff', marginTop: 4 }}>
                      ₹{i.totalAmount.toLocaleString()}
                    </Text>
                    <Text style={styles.cardDetail}>Due: {i.dueDate}</Text>

                    {i.status !== 'PAID' && (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#4f46e5' }]}
                          onPress={() => triggerManualWhatsApp(i, 'GENTLE_REMINDER')}
                        >
                          <Text style={styles.smallBtnText}>WhatsApp Alert</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.smallBtn, { backgroundColor: '#10b981' }]}
                          onPress={() => simulatePaymentReceived(i)}
                        >
                          <Text style={styles.smallBtnText}>Mark Paid (Demo)</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <TouchableOpacity
                      style={{ marginTop: 8 }}
                      onPress={() => {
                        setSelectedInvoice(i);
                        setCurrentScreen('FollowUpDetail');
                      }}
                    >
                      <Text style={{ color: '#a5b4fc', fontSize: 12 }}>Check Follow-up History &rarr;</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              <View style={{ height: 30 }} />
            </ScrollView>
            {renderFooter()}
          </View>
        )}

        {/* CREATE INVOICE SCREEN */}
        {currentScreen === 'CreateInvoice' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Raise Invoice', 'Invoices')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.formContainer}>
                <Text style={styles.inputLabel}>CHOOSE CUSTOMER *</Text>
                <View style={styles.pickerWrapper}>
                  {customers.map((c) => (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.pickerItem, invCustId === c.id && styles.pickerItemActive]}
                      onPress={() => setInvCustId(c.id)}
                    >
                      <Text style={{ color: '#fff', fontSize: 13 }}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inputLabel}>CHOOSE SURVEY JOB</Text>
                <View style={styles.pickerWrapper}>
                  {surveyWorks
                    .filter(w => w.status === 'COMPLETED')
                    .map((w) => (
                      <TouchableOpacity
                        key={w.id}
                        style={[styles.pickerItem, invWorkId === w.id && styles.pickerItemActive]}
                        onPress={() => setInvWorkId(w.id)}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>{w.workNumber} - {w.workType}</Text>
                      </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.inputLabel}>INVOICE DATE</Text>
                <TextInput style={styles.input} value={invDate} onChangeText={setInvDate} />

                <Text style={styles.inputLabel}>DUE DATE</Text>
                <TextInput style={styles.input} value={invDueDate} onChangeText={setInvDueDate} />

                <Text style={styles.inputLabel}>BASE SERVICE VALUE (INR) *</Text>
                <TextInput style={styles.input} placeholder="excluding GST" keyboardType="numeric" placeholderTextColor="#64748b" value={invAmount} onChangeText={setInvAmount} />

                {invAmount ? (
                  <View style={styles.infoCard}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      GST (18%): ₹{(Number(invAmount) * 0.18).toFixed(2)}
                    </Text>
                    <Text style={{ color: '#06b6d4', fontSize: 14, fontWeight: 'bold', marginTop: 4 }}>
                      Payable Amount: ₹{(Number(invAmount) * 1.18).toFixed(2)}
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity style={styles.primaryButton} onPress={createBillingInvoice}>
                  <Text style={styles.primaryButtonText}>Raise Bill & Send Link</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* FOLLOW UP DETAIL / REMINDER HISTORY SCREEN */}
        {currentScreen === 'FollowUpDetail' && selectedInvoice && (
          <View style={{ flex: 1 }}>
            {renderHeader('Follow-up Sheet', 'Invoices')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.detailCard}>
                <Text style={{ fontSize: 12, color: '#06b6d4', fontWeight: 'bold' }}>{selectedInvoice.invoiceNumber}</Text>
                <Text style={{ fontSize: 20, color: '#fff', fontWeight: 'bold', marginVertical: 4 }}>{selectedInvoice.customerName}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Pending Amount: ₹{selectedInvoice.totalAmount.toLocaleString()}</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Due Date: {selectedInvoice.dueDate}</Text>
                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>Pay Link: {selectedInvoice.paymentLink}</Text>
              </View>

              <Text style={styles.sectionHeader}>Dispatch Logs</Text>
              {reminderLogs
                .filter(l => l.invoiceNumber === selectedInvoice.invoiceNumber)
                .map((log) => (
                  <View key={log.id} style={styles.historyCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>{log.type}</Text>
                      <Text style={{ fontSize: 11, color: log.deliveryStatus === 'SENT' ? '#10b981' : '#ef4444' }}>
                        {log.deliveryStatus}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: '#94a3b8' }}>By: {log.triggeredBy}</Text>
                      <Text style={{ fontSize: 12, color: '#64748b' }}>{log.sentDate}</Text>
                    </View>
                  </View>
                ))}

              <View style={{ flexDirection: 'row', gap: 10, marginHorizontal: 15, marginTop: 15 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)' }]}
                  onPress={() => triggerManualWhatsApp(selectedInvoice, 'PENDING_PAYMENT')}
                >
                  <Text style={styles.actionBtnText}>Send Reminder 3</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, backgroundColor: 'var(--danger-glow)' }]}
                  onPress={() => triggerManualWhatsApp(selectedInvoice, 'OVERDUE_PAYMENT')}
                >
                  <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Send Overdue 4</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* REMINDER HISTORY SCREEN */}
        {currentScreen === 'ReminderHistory' && (
          <View style={{ flex: 1 }}>
            {renderHeader('All Reminders Log', 'Dashboard')}
            <ScrollView style={styles.scrollBody}>
              {reminderLogs.map((log) => (
                <View key={log.id} style={styles.historyCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontWeight: 'bold', color: '#f8fafc' }}>{log.customerName}</Text>
                    <Text style={{ fontSize: 11, color: '#06b6d4', fontWeight: 'bold' }}>{log.type}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>Inv: {log.invoiceNumber}</Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>{log.sentDate}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>Trigger: {log.triggeredBy}</Text>
                    <Text style={{ fontSize: 11, color: '#10b981' }}>{log.deliveryStatus}</Text>
                  </View>
                </View>
              ))}
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* REPORTS SCREEN */}
        {currentScreen === 'Reports' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Aging Reports', 'Dashboard')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.detailCard}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Collection Aging Tracker</Text>
                <Text style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Outstanding dues categorized by age</Text>

                <View style={{ marginTop: 20, gap: 12 }}>
                  {/* Aging Buckets Mocks */}
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>0 - 7 Days</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>₹45,000</Text>
                    </View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: '40%', backgroundColor: '#06b6d4' }]} /></View>
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>8 - 15 Days</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>₹35,000</Text>
                    </View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: '30%', backgroundColor: '#06b6d4' }]} /></View>
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>16 - 30 Days</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>₹25,000</Text>
                    </View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: '22%', backgroundColor: '#06b6d4' }]} /></View>
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>31 - 60 Days</Text>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>₹15,000</Text>
                    </View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: '15%', backgroundColor: '#f59e0b' }]} /></View>
                  </View>

                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>Above 60 Days</Text>
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: 'bold' }}>₹85,000</Text>
                    </View>
                    <View style={styles.barTrack}><View style={[styles.barFill, { width: '80%', backgroundColor: '#ef4444' }]} /></View>
                  </View>
                </View>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        )}

        {/* SETTINGS SCREEN */}
        {currentScreen === 'Settings' && (
          <View style={{ flex: 1 }}>
            {renderHeader('Settings')}
            <ScrollView style={styles.scrollBody}>
              <View style={styles.detailCard}>
                <Text style={{ fontSize: 18, color: '#fff', fontWeight: 'bold' }}>{userName}</Text>
                <Text style={{ color: '#06b6d4', fontSize: 12, fontWeight: '600', marginTop: 2 }}>{userRole} Profile</Text>
                <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 8 }}>Tenant: SAJ Surveys India Pvt Ltd</Text>
              </View>

              <View style={[styles.formContainer, { marginTop: 15 }]}>
                <TouchableOpacity
                  style={[styles.secondaryButton, { borderColor: '#ef4444' }]}
                  onPress={handleLogoutPress}
                >
                  <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Log Out</Text>
                </TouchableOpacity>
              </View>
              <View style={{ height: 30 }} />
            </ScrollView>
            {renderFooter()}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#090d16',
  },
  loginFooter: {
    marginTop: 25,
    marginBottom: 45,
    alignItems: 'center',
  },
  loginFooterText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  loginCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  loginLogoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  loginLogoIcon: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  logoText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  loginLogoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
  },
  loginSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  formContainer: {
    width: '100%',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 15,
  },
  input: {
    width: '100%',
    height: 48,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 15,
  },
  primaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    width: '100%',
    height: 48,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryButtonText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    height: 60,
    backgroundColor: '#0d1324',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  logoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#4f46e5',
  },
  logoBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 90 : 80,
    paddingBottom: Platform.OS === 'ios' ? 25 : 20,
    backgroundColor: '#0d1324',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#4f46e5',
  },
  tabText: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollBody: {
    flex: 1,
    padding: 16,
  },
  welcomeBanner: {
    marginBottom: 20,
  },
  welcomeTitle: {
    color: '#64748b',
    fontSize: 14,
  },
  welcomeName: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    padding: 16,
  },
  statsLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  sectionHeader: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    marginTop: 20,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionBtn: {
    width: (width - 42) / 2,
    height: 50,
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  historyCard: {
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    marginBottom: 10,
  },
  linkRow: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  linkRowText: {
    color: '#a5b4fc',
    fontSize: 13,
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0d1324',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    color: '#fff',
  },
  addButtonIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#4f46e5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listCard: {
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 12,
  },
  cardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
  },
  cardDetail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 3,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgePrimary: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderColor: 'rgba(79, 70, 229, 0.3)',
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  badgeDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  smallBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pickerWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  pickerItem: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 6,
  },
  pickerItemActive: {
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
  },
  infoCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  detailCard: {
    backgroundColor: 'rgba(17, 24, 43, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    marginBottom: 20,
  },
  barTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    marginTop: 4,
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  }
});
