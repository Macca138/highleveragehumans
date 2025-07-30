const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const validator = require('validator');
const Joi = require('joi');
const { RateLimiterMemory } = require('rate-limiter-flexible');

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API endpoints
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: [
    'https://highleveragehumans.com',
    'https://www.highleveragehumans.com',
    /^https:\/\/.*\.highleveragehumans\.com$/,
    /^https:\/\/highleveragehumans-.*\.web\.app$/,
    /^https:\/\/highleveragehumans-.*\.firebaseapp\.com$/
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting configuration
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => req.ip || req.connection.remoteAddress,
  points: 10, // Number of requests
  duration: 60, // Per 60 seconds by IP
});

const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.ip || req.connection.remoteAddress);
    next();
  } catch (rejRes) {
    const msBeforeNext = rejRes.msBeforeNext || 1000;
    res.set('Retry-After', Math.round(msBeforeNext / 1000) || 1);
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.round(msBeforeNext / 1000) || 1
    });
  }
};

// Email validation schema
const emailSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email address is too long',
      'any.required': 'Email address is required'
    }),
  source: Joi.string()
    .max(100)
    .default('website')
    .optional(),
  campaign: Joi.string()
    .max(100)
    .optional(),
  metadata: Joi.object()
    .max(10)
    .optional()
});

// Utility functions
const sanitizeEmail = (email) => {
  return validator.normalizeEmail(email, {
    gmail_lowercase: true,
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
    outlookdotcom_lowercase: true,
    outlookdotcom_remove_subaddress: false,
    yahoo_lowercase: true,
    yahoo_remove_subaddress: false,
    icloud_lowercase: true,
    icloud_remove_subaddress: false
  });
};

const validateEmailDomain = (email) => {
  const domain = email.split('@')[1];
  if (!domain) return false;
  
  // Block common disposable email domains
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'temp-mail.org',
    'throwaway.email',
    'yopmail.com'
  ];
  
  return !disposableDomains.includes(domain.toLowerCase());
};

const logAnalyticsEvent = async (eventName, parameters) => {
  try {
    // Log to Firestore for analytics
    await db.collection('analytics_events').add({
      event: eventName,
      parameters,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      source: 'cloud_function'
    });
  } catch (error) {
    console.error('Analytics logging error:', error);
  }
};

// Email capture endpoint
app.post('/email-capture', rateLimiterMiddleware, async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Validate request body
    const { error, value } = emailSchema.validate(req.body);
    if (error) {
      await logAnalyticsEvent('email_capture_validation_error', {
        error: error.details[0].message,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, source, campaign, metadata } = value;

    // Sanitize and validate email
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate email domain
    if (!validateEmailDomain(sanitizedEmail)) {
      await logAnalyticsEvent('email_capture_blocked_domain', {
        email: sanitizedEmail,
        ip: req.ip
      });
      
      return res.status(400).json({
        success: false,
        error: 'Please use a valid email address'
      });
    }

    // Check if email already exists
    const existingEmailQuery = await db
      .collection('email_leads')
      .where('email', '==', sanitizedEmail)
      .limit(1)
      .get();

    let leadData = {
      email: sanitizedEmail,
      source: source || 'website',
      campaign: campaign || null,
      metadata: metadata || {},
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
      referrer: req.get('Referer') || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };

    if (existingEmailQuery.empty) {
      // New email - create record
      leadData.isNew = true;
      leadData.subscriptionCount = 1;
      
      const docRef = await db.collection('email_leads').add(leadData);
      
      await logAnalyticsEvent('email_capture_success', {
        email: sanitizedEmail,
        source,
        campaign,
        isNew: true,
        leadId: docRef.id
      });

      res.status(201).json({
        success: true,
        message: 'Successfully subscribed to updates',
        isNew: true,
        leadId: docRef.id,
        processingTime: Date.now() - startTime
      });
    } else {
      // Existing email - update record
      const existingDoc = existingEmailQuery.docs[0];
      const existingData = existingDoc.data();
      
      await existingDoc.ref.update({
        lastSubscription: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionCount: admin.firestore.FieldValue.increment(1),
        source: source || existingData.source,
        campaign: campaign || existingData.campaign,
        metadata: { ...existingData.metadata, ...metadata },
        status: 'active'
      });

      await logAnalyticsEvent('email_capture_duplicate', {
        email: sanitizedEmail,
        source,
        campaign,
        isNew: false,
        leadId: existingDoc.id
      });

      res.status(200).json({
        success: true,
        message: 'Email updated successfully',
        isNew: false,
        leadId: existingDoc.id,
        processingTime: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error('Email capture error:', error);
    
    await logAnalyticsEvent('email_capture_error', {
      error: error.message,
      stack: error.stack,
      ip: req.ip
    });

    res.status(500).json({
      success: false,
      error: 'Internal server error. Please try again.',
      processingTime: Date.now() - startTime
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Analytics endpoint for retrieving basic stats
app.get('/stats', rateLimiterMiddleware, async (req, res) => {
  try {
    const leadsSnapshot = await db.collection('email_leads').get();
    const totalLeads = leadsSnapshot.size;
    
    const activeLeadsSnapshot = await db
      .collection('email_leads')
      .where('status', '==', 'active')
      .get();
    const activeLeads = activeLeadsSnapshot.size;

    res.status(200).json({
      success: true,
      stats: {
        totalLeads,
        activeLeads,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to retrieve stats'
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Export the Cloud Function
exports.emailCapture = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB'
  })
  .https
  .onRequest(app);

// Scheduled function to clean up old analytics events (runs daily)
exports.cleanupAnalytics = functions
  .pubsub
  .schedule('0 2 * * *')
  .timeZone('UTC')
  .onRun(async (context) => {
    const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    const oldEventsQuery = db
      .collection('analytics_events')
      .where('timestamp', '<', thirtyDaysAgo)
      .limit(500);

    const snapshot = await oldEventsQuery.get();
    
    if (snapshot.empty) {
      console.log('No old analytics events to delete');
      return null;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${snapshot.size} old analytics events`);
    
    return null;
  });

// Function to export leads data (admin only)
exports.exportLeads = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB'
  })
  .https
  .onCall(async (data, context) => {
    // Verify authentication (you should implement proper admin auth)
    if (!context.auth || !context.auth.token.admin) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only administrators can export leads data.'
      );
    }

    try {
      const leadsSnapshot = await db.collection('email_leads').get();
      const leads = [];

      leadsSnapshot.forEach(doc => {
        const leadData = doc.data();
        leads.push({
          id: doc.id,
          email: leadData.email,
          source: leadData.source,
          campaign: leadData.campaign,
          timestamp: leadData.timestamp?.toDate?.()?.toISOString() || null,
          subscriptionCount: leadData.subscriptionCount || 1,
          status: leadData.status || 'active'
        });
      });

      return {
        success: true,
        leads,
        totalCount: leads.length,
        exportedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Export leads error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to export leads data.'
      );
    }
  });