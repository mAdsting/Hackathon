// Google Calendar API configuration (move to top)
const CLIENT_ID = '1095854285568-1ke6hsgom517lh7d48fr59ot2t6mpvk4.apps.googleusercontent.com';
const API_KEY = 'AIzaSyAM9KYfErszKLoxmz1Wh_zbGY9sffFlGkI';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar';

// Notification API URL (always use backend port 3000)
const NOTIFICATION_API_URL = 'http://localhost:3000/api';

// Declare these at the top before any function uses them
let tokenClient;
let gapiInited = false;
let gisInited = false;

// Initialize Supabase client
const supabaseUrl = 'https://gnoeoiubnofocqpnwerg.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdub2VvaXVibm9mb2NxcG53ZXJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyMzgxNjEsImV4cCI6MjA2MzgxNDE2MX0.mTWeLQuufTbF7INeDdv4rgkY48aa1jqqYL9uDCfwC7I'

// Create Supabase client
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey)

// Test Supabase connection
async function testSupabaseConnection() {
    try {
        // First test basic auth connection
        const { data: authData, error: authError } = await supabase.auth.getSession()
        if (authError) {
            console.error('Auth connection error:', authError)
            showMessage('Error connecting to authentication service: ' + authError.message, 'error')
            return
        }
        console.log('Auth connection successful')

        // Then test database connection
        const { data, error } = await supabase.from('profiles').select('*').limit(1)
        if (error) {
            if (error.code === '42P01') { // Table doesn't exist
                console.warn('Profiles table does not exist yet. Please create the required tables in Supabase.')
                showMessage('Database tables need to be created. Please contact the administrator.', 'error')
            } else {
                console.error('Database connection error:', error)
                showMessage('Error connecting to database: ' + error.message, 'error')
            }
        } else {
            console.log('Database connection successful:', data)
        }
    } catch (error) {
        console.error('Unexpected error:', error)
        showMessage('Unexpected error: ' + error.message, 'error')
    }
}

// DOM Elements
const authSection = document.getElementById('auth-section')
const dashboardSection = document.getElementById('dashboard-section')
const toggleAuthBtn = document.getElementById('toggle-auth')
const loginForm = document.getElementById('login-form')
const signupForm = document.getElementById('signup-form')
const logoutBtn = document.getElementById('logout-btn')

// Toggle between login and signup forms
toggleAuthBtn.addEventListener('click', () => {
    const isLoginVisible = !loginForm.classList.contains('hidden')
    loginForm.classList.toggle('hidden')
    signupForm.classList.toggle('hidden')
    toggleAuthBtn.textContent = isLoginVisible ? 'Switch to Login' : 'Switch to Signup'
})

// Handle Signup
signupForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const email = document.getElementById('signup-email').value
    const password = document.getElementById('signup-password').value
    const fullName = document.getElementById('signup-name').value

    console.log('Attempting signup with:', { email, fullName })

    try {
        // Create user in Supabase
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        })

        console.log('Auth response:', { authData, authError })

        if (authError) throw authError

        if (authData?.user) {
            // Create user profile in the database
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: authData.user.id,
                        full_name: fullName,
                        email: email
                    }
                ])
                .select()

            console.log('Profile creation response:', { profileError })

            if (profileError) {
                console.error('Profile creation error:', profileError)
                // If profile creation fails, we should still show success message for auth
                showMessage('Account created successfully! Please check your email for verification. You may need to complete your profile after logging in.', 'success')
            } else {
                showMessage('Account created successfully! Please check your email for verification.', 'success')
            }
            
            signupForm.reset()
        } else {
            throw new Error('No user data returned from signup')
        }
    } catch (error) {
        console.error('Signup error:', error)
        showMessage(error.message, 'error')
    }
})

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value

    console.log('Attempting login with:', email)

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        console.log('Login response:', { data, error })

        if (error) throw error

        // Show dashboard and hide auth section
        authSection.classList.add('hidden')
        dashboardSection.classList.remove('hidden')
        
        // Load dashboard data
        loadDashboardData()
    } catch (error) {
        console.error('Login error:', error)
        showMessage(error.message, 'error')
    }
})

// Handle Logout
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut()
        if (error) throw error

        // Show auth section and hide dashboard
        dashboardSection.classList.add('hidden')
        authSection.classList.remove('hidden')
        
        // Reset forms
        loginForm.reset()
        signupForm.reset()
    } catch (error) {
        console.error('Logout error:', error)
        showMessage(error.message, 'error')
    }
})

// Utility function to show messages
function showMessage(message, type) {
    console.log('Showing message:', { message, type })
    
    const messageDiv = document.createElement('div')
    messageDiv.className = `message ${type}`
    messageDiv.textContent = message
    
    // Remove any existing messages
    const existingMessage = document.querySelector('.message')
    if (existingMessage) {
        existingMessage.remove()
    }
    
    // Add new message
    document.querySelector('main').insertBefore(messageDiv, document.querySelector('section'))
    
    // Remove message after 5 seconds
    setTimeout(() => {
        messageDiv.remove()
    }, 5000)
}

// Check for existing session on page load
async function checkSession() {
    console.log('Checking session...')
    
    const { data: { session }, error } = await supabase.auth.getSession()
    
    console.log('Session check response:', { session, error })
    
    if (error) {
        console.error('Session check error:', error)
        return
    }
    
    if (session) {
        authSection.classList.add('hidden')
        dashboardSection.classList.remove('hidden')
        loadDashboardData()
    }
}

// Load dashboard data
async function loadDashboardData() {
    console.log('Loading dashboard data...')
    
    // Load patients for dropdown
    await loadPatients()
    
    // Load doctors for dropdown
    await loadDoctors()
    
    // Load appointments
    await loadAppointments()
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded. Initializing app...')
    testSupabaseConnection()
    checkSession()
    checkUpcomingAppointments() // Add initial check
})

// Add patient form handler
document.getElementById('add-patient-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = document.getElementById('patient-name').value
    const phone = document.getElementById('patient-phone').value
    const email = document.getElementById('patient-email').value
    const notifySMS = document.getElementById('notify-sms').checked
    const notifyWhatsApp = document.getElementById('notify-whatsapp').checked
    const notifyEmail = document.getElementById('notify-email').checked

    console.log('Attempting to add patient:', { name, phone, email, notifySMS, notifyWhatsApp, notifyEmail })

    try {
        const { data, error } = await supabase
            .from('patients')
            .insert([
                {
                    name: name,
                    phone_number: phone,
                    email: email,
                    notification_preferences: {
                        sms: notifySMS,
                        whatsapp: notifyWhatsApp,
                        email: notifyEmail
                    }
                }
            ])
            .select()

        console.log('Patient creation response:', { data, error })

        if (error) {
            console.error('Error creating patient:', error)
            showMessage('Error creating patient: ' + error.message, 'error')
            return
        }

        showMessage('Patient added successfully!', 'success')
        
        // Clear the form
        document.getElementById('patient-name').value = ''
        document.getElementById('patient-phone').value = ''
        document.getElementById('patient-email').value = ''
        document.getElementById('notify-sms').checked = true
        document.getElementById('notify-whatsapp').checked = true
        document.getElementById('notify-email').checked = true

        // Refresh the patient dropdown in the appointment form
        await loadPatients()
    } catch (error) {
        console.error('Unexpected error creating patient:', error)
        showMessage('Unexpected error creating patient: ' + error.message, 'error')
    }
})

// Load patients for dropdown
async function loadPatients() {
    console.log('Loading patients...')
    try {
        const { data: patients, error } = await supabase
            .from('patients')
            .select('*')
            .order('name')

        console.log('Patients load response:', { patients, error })

        if (error) {
            console.error('Error loading patients:', error)
            showMessage('Error loading patients: ' + error.message, 'error')
            return
        }

        const patientSelect = document.getElementById('appointment-patient')
        patientSelect.innerHTML = '<option value="">Select Patient</option>'
        
        if (patients && patients.length > 0) {
            patients.forEach(patient => {
                const option = document.createElement('option')
                option.value = patient.id
                option.textContent = patient.name
                // Store additional data in dataset
                option.dataset.phone = patient.phone_number
                option.dataset.email = patient.email
                option.dataset.notificationPreferences = JSON.stringify(patient.notification_preferences)
                patientSelect.appendChild(option)
            })
        }
    } catch (error) {
        console.error('Unexpected error loading patients:', error)
        showMessage('Unexpected error loading patients: ' + error.message, 'error')
    }
}

// Send notification function
async function sendNotification(to, message, channel) {
    try {
        const response = await fetch(`${NOTIFICATION_API_URL}/send-${channel}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ to, message })
        });

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error);
        }
        return result;
    } catch (error) {
        console.error(`Error sending ${channel} notification:`, error);
        throw error;
    }
}

// Add appointment form handler
document.getElementById('add-appointment-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const patientId = document.getElementById('appointment-patient').value
    const doctorId = document.getElementById('appointment-doctor').value
    const time = document.getElementById('appointment-time').value
    const type = document.getElementById('appointment-type').value
    const notes = document.getElementById('appointment-notes').value
    const reminderDays = document.getElementById('reminder-days').value

    console.log('Attempting to add appointment:', { patientId, doctorId, time, type, reminderDays })

    try {
        // Get patient details for notifications
        const patientSelect = document.getElementById('appointment-patient')
        const selectedOption = patientSelect.options[patientSelect.selectedIndex]
        const patientPhone = selectedOption.dataset.phone
        const patientEmail = selectedOption.dataset.email
        const notificationPreferences = JSON.parse(selectedOption.dataset.notificationPreferences || '{}')

        // First, create the appointment
        const { data, error } = await supabase
            .from('appointments')
            .insert([
                {
                    patient_id: patientId,
                    doctor_id: doctorId,
                    appointment_time: time,
                    type: type,
                    notes: notes,
                    reminder_days: reminderDays
                }
            ])
            .select()

        if (error) {
            console.error('Error creating appointment:', error)
            showMessage('Error creating appointment: ' + error.message, 'error')
            return
        }

        // Get patient and doctor details for calendar event
        const { data: patientData, error: patientError } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .single()

        if (patientError) {
            console.error('Error fetching patient data:', patientError)
            showMessage('Error fetching patient data: ' + patientError.message, 'error')
            return
        }

        const { data: doctorData, error: doctorError } = await supabase
            .from('doctors')
            .select('*')
            .eq('id', doctorId)
            .single()

        if (doctorError) {
            console.error('Error fetching doctor data:', doctorError)
            showMessage('Error fetching doctor data: ' + doctorError.message, 'error')
            return
        }

        // Create Google Calendar event
        try {
            if (!isGoogleCalendarAuthorized()) {
                showMessage('Please connect to Google Calendar first by clicking the "Connect Google Calendar" button', 'warning')
            } else {
                await createCalendarEvent(data[0], patientData, doctorData)
                showMessage('Appointment added successfully and calendar invite sent!', 'success')
            }
        } catch (calendarError) {
            console.error('Error creating calendar event:', calendarError)
            showMessage('Appointment added but calendar invite failed: ' + calendarError.message, 'warning')
        }

        // Send notifications based on preferences
        const appointmentTime = new Date(time)
        const formattedTime = appointmentTime.toLocaleString()
        const message = `
            Reminder: You have an upcoming appointment with Dr. ${doctorData.name} 
            at ${doctorData.clinic_name} on ${formattedTime}.
            Appointment Type: ${type}
            ${notes ? `Notes: ${notes}` : ''}
        `

        // Send SMS if enabled
        if (notificationPreferences.sms && patientPhone) {
            try {
                await sendNotification(patientPhone, message, 'sms')
                showMessage('SMS notification sent successfully', 'success')
            } catch (smsError) {
                showMessage('Failed to send SMS: ' + smsError.message, 'error')
            }
        }

        // Send WhatsApp if enabled
        if (notificationPreferences.whatsapp && patientPhone) {
            try {
                await sendNotification(patientPhone, message, 'whatsapp')
                showMessage('WhatsApp notification sent successfully', 'success')
            } catch (whatsappError) {
                showMessage('Failed to send WhatsApp message: ' + whatsappError.message, 'error')
            }
        }

        // Send email if enabled
        if (notificationPreferences.email && patientEmail) {
            try {
                await sendNotification(patientEmail, message, 'email')
                showMessage('Email notification sent successfully', 'success')
            } catch (emailError) {
                showMessage('Failed to send email: ' + emailError.message, 'error')
            }
        }
        
        // Clear the form
        document.getElementById('appointment-patient').value = ''
        document.getElementById('appointment-doctor').value = ''
        document.getElementById('appointment-time').value = ''
        document.getElementById('appointment-type').value = ''
        document.getElementById('appointment-notes').value = ''
        document.getElementById('reminder-days').value = '2'

        // Refresh the appointments list
        await loadAppointments()
    } catch (error) {
        console.error('Unexpected error creating appointment:', error)
        showMessage('Unexpected error creating appointment: ' + error.message, 'error')
    }
})

// Load doctors for dropdown
async function loadDoctors() {
    console.log('Loading doctors...')
    try {
        const { data: doctors, error } = await supabase
            .from('doctors')
            .select('*')
            .order('name')

        console.log('Doctors load response:', { doctors, error })

        if (error) {
            console.error('Error loading doctors:', error)
            showMessage('Error loading doctors: ' + error.message, 'error')
            return
        }

        const doctorSelect = document.getElementById('appointment-doctor')
        doctorSelect.innerHTML = '<option value="">Select Doctor</option>'
        
        if (doctors && doctors.length > 0) {
            doctors.forEach(doctor => {
                const option = document.createElement('option')
                option.value = doctor.id
                option.textContent = `${doctor.name} (${doctor.clinic_name || 'No Clinic'})`
                doctorSelect.appendChild(option)
            })
        }
    } catch (error) {
        console.error('Unexpected error loading doctors:', error)
        showMessage('Unexpected error loading doctors: ' + error.message, 'error')
    }
}

// Add doctor form handler
document.getElementById('add-doctor-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    
    const name = document.getElementById('doctor-name').value
    const clinic = document.getElementById('doctor-clinic').value
    const email = document.getElementById('doctor-email').value
    const phone = document.getElementById('doctor-phone').value

    console.log('Attempting to add doctor:', { name, clinic, email, phone })

    try {
        const { data, error } = await supabase
            .from('doctors')
            .insert([
                {
                    name: name,
                    clinic_name: clinic,
                    email: email,
                    phone_number: phone
                }
            ])
            .select()

        console.log('Doctor creation response:', { data, error })

        if (error) {
            console.error('Error creating doctor:', error)
            showMessage('Error creating doctor: ' + error.message, 'error')
            return
        }

        showMessage('Doctor added successfully!', 'success')
        
        // Clear the form
        document.getElementById('doctor-name').value = ''
        document.getElementById('doctor-clinic').value = ''
        document.getElementById('doctor-email').value = ''
        document.getElementById('doctor-phone').value = ''

        // Refresh the doctor dropdown
        await loadDoctors()
    } catch (error) {
        console.error('Unexpected error creating doctor:', error)
        showMessage('Unexpected error creating doctor: ' + error.message, 'error')
    }
})

// Check for upcoming appointments and send reminders
async function checkUpcomingAppointments() {
    console.log('Checking for upcoming appointments...')
    try {
        const now = new Date()
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_time,
                type,
                reminder_days,
                patient:patient_id (
                    id,
                    name,
                    email,
                    phone_number
                ),
                doctor:doctor_id (
                    id,
                    name,
                    clinic_name
                )
            `)
            .gte('appointment_time', now.toISOString())
            .order('appointment_time', { ascending: true })

        if (error) {
            console.error('Error checking appointments:', error)
            return
        }

        appointments.forEach(appointment => {
            const appointmentTime = new Date(appointment.appointment_time)
            const reminderDate = new Date(appointmentTime)
            reminderDate.setDate(reminderDate.getDate() - (appointment.reminder_days || 2))

            // If we're within 24 hours of the reminder date
            if (Math.abs(now - reminderDate) < 24 * 60 * 60 * 1000) {
                sendReminder(appointment)
            }
        })
    } catch (error) {
        console.error('Error in checkUpcomingAppointments:', error)
    }
}

// Twilio configuration
const TWILIO_ACCOUNT_SID = 'YOUR_TWILIO_ACCOUNT_SID';
const TWILIO_AUTH_TOKEN = 'YOUR_TWILIO_AUTH_TOKEN';
const TWILIO_PHONE_NUMBER = 'YOUR_TWILIO_PHONE_NUMBER';
const TWILIO_WHATSAPP_NUMBER = 'whatsapp:+14155238886'; // Your Twilio WhatsApp number

// Send reminder for an appointment
async function sendReminder(appointment) {
    const appointmentTime = new Date(appointment.appointment_time)
    const formattedTime = appointmentTime.toLocaleString()
    
    // Create reminder message
    const message = `
        Reminder: You have an upcoming appointment with Dr. ${appointment.doctor.name} 
        at ${appointment.doctor.clinic_name} on ${formattedTime}.
        Appointment Type: ${appointment.type}
        ${appointment.notes ? `Notes: ${appointment.notes}` : ''}
    `

    // Show reminder in the UI
    showMessage(message, 'info')

    try {
        const preferences = appointment.patient.notification_preferences || {
            sms: true,
            whatsapp: true,
            email: true
        }

        // Send SMS if enabled and phone number is available
        if (preferences.sms && appointment.patient.phone_number) {
            try {
                const response = await fetch('/api/send-sms', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: appointment.patient.phone_number,
                        message: message
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('SMS reminder sent successfully');
                    showMessage('SMS reminder sent successfully', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (smsError) {
                console.error('Error sending SMS:', smsError);
                showMessage('Failed to send SMS: ' + smsError.message, 'error');
            }
        }

        // Send WhatsApp message if enabled and phone number is available
        if (preferences.whatsapp && appointment.patient.phone_number) {
            try {
                const response = await fetch('/api/send-whatsapp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: appointment.patient.phone_number,
                        message: message
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('WhatsApp reminder sent successfully');
                    showMessage('WhatsApp reminder sent successfully', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (whatsappError) {
                console.error('Error sending WhatsApp message:', whatsappError);
                showMessage('Failed to send WhatsApp message: ' + whatsappError.message, 'error');
            }
        }

        // Send email if enabled and email is available
        if (preferences.email && appointment.patient.email) {
            try {
                const response = await fetch('/api/send-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to: appointment.patient.email,
                        subject: 'Appointment Reminder',
                        message: message
                    })
                });
                const result = await response.json();
                if (result.success) {
                    console.log('Email reminder sent successfully');
                    showMessage('Email reminder sent successfully', 'success');
                } else {
                    throw new Error(result.error);
                }
            } catch (emailError) {
                console.error('Error sending email:', emailError);
                showMessage('Failed to send email: ' + emailError.message, 'error');
            }
        }

        // Log reminder details
        console.log('Reminder sent:', {
            patient: appointment.patient.name,
            email: appointment.patient.email,
            phone: appointment.patient.phone_number,
            preferences: preferences,
            message: message
        });
    } catch (error) {
        console.error('Error sending reminders:', error);
        showMessage('Error sending reminders: ' + error.message, 'error');
    }
}

// Check for reminders every hour
setInterval(checkUpcomingAppointments, 60 * 60 * 1000)

// Initialize Google API
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

async function initializeGapiClient() {
    try {
        await gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: [DISCOVERY_DOC],
        });
        gapiInited = true;
        updateGoogleCalendarStatus();
    } catch (error) {
        console.error('Error initializing GAPI client:', error);
        updateGoogleCalendarStatus('Error initializing Google Calendar API');
    }
}

function gisLoaded() {
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: '', // defined later
            prompt: 'consent',
            hint: '',
            hosted_domain: '',
            ux_mode: 'popup',
            context: 'signin'
        });
        gisInited = true;
        updateGoogleCalendarStatus();
    } catch (error) {
        console.error('Error initializing GIS client:', error);
        updateGoogleCalendarStatus('Error initializing Google Calendar authentication');
    }
}

function updateGoogleCalendarStatus(message = null) {
    const authMessage = document.getElementById('google-auth-message');
    const authButton = document.getElementById('authorize-button');
    const signoutButton = document.getElementById('signout-button');

    if (message) {
        authMessage.textContent = message;
        authButton.style.display = 'none';
        signoutButton.style.display = 'none';
        return;
    }

    if (!gapiInited || !gisInited) {
        authMessage.textContent = 'Loading Google Calendar integration...';
        authButton.style.display = 'none';
        signoutButton.style.display = 'none';
    } else if (gapi.client.getToken()) {
        authMessage.textContent = 'Google Calendar connected';
        authButton.style.display = 'none';
        signoutButton.style.display = 'block';
    } else {
        authMessage.textContent = 'Google Calendar not connected';
        authButton.style.display = 'block';
        signoutButton.style.display = 'none';
    }
}

// Handle the authorization button click
function handleAuthClick() {
    if (!gapi.client.getToken()) {
        tokenClient.callback = async (resp) => {
            if (resp.error !== undefined) {
                throw (resp);
            }
            updateGoogleCalendarStatus();
        };

        try {
            tokenClient.requestAccessToken();
        } catch (err) {
            console.error('Error requesting access token:', err);
            updateGoogleCalendarStatus('Error connecting to Google Calendar');
        }
    }
}

// Handle the signout button click
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        try {
            google.accounts.oauth2.revoke(token.access_token);
            gapi.client.setToken('');
            updateGoogleCalendarStatus();
        } catch (err) {
            console.error('Error signing out:', err);
            updateGoogleCalendarStatus('Error disconnecting from Google Calendar');
        }
    }
}

// Add event listeners for the buttons
document.addEventListener('DOMContentLoaded', () => {
    const authButton = document.getElementById('authorize-button');
    const signoutButton = document.getElementById('signout-button');
    
    if (authButton) {
        authButton.addEventListener('click', handleAuthClick);
    }
    if (signoutButton) {
        signoutButton.addEventListener('click', handleSignoutClick);
    }
});

// Check if Google Calendar is authorized
function isGoogleCalendarAuthorized() {
    return gapiInited && gisInited && gapi.client.getToken() !== null;
}

// Create Google Calendar event
async function createCalendarEvent(appointment, patient, doctor) {
    if (!isGoogleCalendarAuthorized()) {
        throw new Error('Please connect to Google Calendar first');
    }

    const appointmentTime = new Date(appointment.appointment_time);
    const endTime = new Date(appointmentTime);
    endTime.setHours(endTime.getHours() + 1); // Default 1-hour appointment

    const event = {
        'summary': `Medical Appointment: ${appointment.type}`,
        'location': doctor.clinic_name,
        'description': `Appointment with Dr. ${doctor.name}\n\nNotes: ${appointment.notes || 'No additional notes'}`,
        'start': {
            'dateTime': appointmentTime.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        'end': {
            'dateTime': endTime.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
        },
        'attendees': [
            {'email': patient.email},
            {'email': doctor.email}
        ],
        'reminders': {
            'useDefault': false,
            'overrides': [
                {'method': 'email', 'minutes': 24 * 60}, // 1 day before
                {'method': 'popup', 'minutes': 30} // 30 minutes before
            ]
        }
    };

    try {
        const request = await gapi.client.calendar.events.insert({
            'calendarId': 'primary',
            'resource': event,
            'sendUpdates': 'all'
        });
        console.log('Calendar event created:', request.result);
        return request.result;
    } catch (err) {
        console.error('Error creating calendar event:', err);
        throw err;
    }
}

// Restore or define the loadAppointments function
async function loadAppointments() {
    console.log('Loading appointments...')
    try {
        const { data: appointments, error } = await supabase
            .from('appointments')
            .select(`
                id,
                appointment_time,
                type,
                notes,
                patient:patient_id (
                    id,
                    name
                ),
                doctor:doctor_id (
                    id,
                    name,
                    clinic_name
                )
            `)
            .order('appointment_time', { ascending: true })

        console.log('Appointments load response:', { appointments, error })

        if (error) {
            console.error('Error loading appointments:', error)
            showMessage('Error loading appointments: ' + error.message, 'error')
            return
        }

        const tbody = document.querySelector('#appointments-table tbody')
        tbody.innerHTML = ''
        
        if (appointments && appointments.length > 0) {
            appointments.forEach(appointment => {
                const row = document.createElement('tr')
                row.innerHTML = `
                    <td>${appointment.patient?.name || 'Unknown'}</td>
                    <td>${appointment.doctor?.name || 'Unknown'} ${appointment.doctor?.clinic_name ? `(${appointment.doctor.clinic_name})` : ''}</td>
                    <td>${new Date(appointment.appointment_time).toLocaleString()}</td>
                    <td>${appointment.type || ''}</td>
                    <td>${appointment.notes || ''}</td>
                    <td>
                        <button onclick="deleteAppointment('${appointment.id}')">Delete</button>
                    </td>
                `
                tbody.appendChild(row)
            })
        } else {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No appointments found</td></tr>'
        }
    } catch (error) {
        console.error('Unexpected error loading appointments:', error)
        showMessage('Unexpected error loading appointments: ' + error.message, 'error')
    }
}
