# Resource Allocation Tracker Implementation

## Overview
A complete MERN-stack implementation of a Resource Allocation Tracker system that monitors available civic resources (vehicles, officers, equipment) and dynamically suggests optimal deployment based on complaint density and urgency levels.

## System Features

### 1. Resource Management
- **Create Resources**: Add new resources with type, category, location, and availability
- **Manage Availability**: Track available, deployed, and maintenance quantities
- **Priority Levels**: Assign priority levels (low, medium, high, critical)
- **Specializations**: Tag resources with special capabilities (fire-response, hazmat, rescue, etc.)
- **Maintenance Scheduling**: Schedule preventive and corrective maintenance
- **Location Tracking**: Track current and base locations with geospatial indexing

### 2. Role-Based Access Control
- **Citizens**: Can request resources when submitting complaints
- **Public Servants (Department Officers)**: 
  - Can deploy only their department's resources
  - Can manage resources assigned to their department
  - View department-specific statistics
- **Mayor**: 
  - Full control over all resources
  - Can deploy any resource to any complaint
  - Access to city-wide analytics

### 3. Intelligent Deployment Suggestions
- **Complaint Density Analysis**: Analyzes nearby complaints to identify high-density areas
- **Optimal Resource Matching**: Suggests best resources based on:
  - Complaint category/department requirements
  - Geographic proximity (haversine distance calculation)
  - Resource availability and operational status
  - Response time and deployment distance
  - Resource priority levels
- **Suggested Top 5 Resources**: Returns 5 most optimal resources for any complaint

### 4. Deployment Tracking
- **Deployment History**: Complete audit trail of all deployments
- **Deployment Duration**: Automatic calculation of deployment time
- **Return Process**: Proper resource return tracking with completion timestamps
- **Performance Metrics**: Track successful deployments and utilization rates

### 5. Resource Statistics & Analytics
- **Utilization Rate**: Calculate overall resource usage percentage
- **Department Performance**: View resource deployment by department
- **Resource Classification**: Statistics by type, category, and status
- **Success Metrics**: Track successful vs. failed deployments

## Database Schema

### Resource Model
```javascript
{
  name: String (required),
  type: String (enum: Vehicle, Equipment, Officer, Staff, etc.),
  category: String (enum: Emergency Response, Road & Infrastructure, etc.),
  description: String,
  
  // Department Ownership
  department: String (enum: DEPARTMENT_KEYS, required),
  managedBy: ObjectId (User reference, required),
  
  // Availability Tracking
  totalQuantity: Number (required),
  availableQuantity: Number,
  deployedQuantity: Number,
  maintenanceQuantity: Number,
  
  // Location Tracking
  currentLocation: { latitude, longitude, address },
  baseLocation: { latitude, longitude, address },
  
  // Operational Data
  isOperational: Boolean (default: true),
  responseTime: Number (minutes),
  maxDeploymentDistance: Number (km),
  
  // Deployment History & Maintenance
  deploymentHistory: [
    {
      resourceId, deployedBy, deployedTo, location,
      status, deployedAt, returnedAt, duration, notes
    }
  ],
  maintenanceSchedule: [
    {
      scheduledDate, type, status, description,
      completedAt, notes
    }
  ],
  
  // Performance Metrics
  totalDeployments: Number,
  successfulDeployments: Number,
  utilizationRate: Number (0-100),
  
  // Priority & Specialization
  priority: String (low, medium, high, critical),
  specializations: [String],
  
  // Status
  status: String (active, inactive, maintenance, retired)
}
```

### Complaint Model Updates
```javascript
{
  // Existing fields...
  
  // Resource Allocation
  resourceRequest: Boolean,
  requestedResourceTypes: [String],
  requestedResourceUrgency: String (Low, Medium, High, Critical),
  allocatedResources: [
    {
      resourceId, resourceName, quantity, allocatedAt,
      status (requested/deployed/in-transit/returned)
    }
  ],
  resourceDeploymentHistory: [
    {
      resourceId, deployedAt, returnedAt,
      deploymentDuration, deployedBy
    }
  ]
}
```

## API Endpoints

### Resource Management
```
POST   /api/v1/resources                    - Create resource
GET    /api/v1/resources                    - Get all resources (with filters)
GET    /api/v1/resources/:id                - Get single resource
PUT    /api/v1/resources/:id                - Update resource
DELETE /api/v1/resources/:id                - Delete resource

POST   /api/v1/resources/:id/deploy         - Deploy resource to complaint
POST   /api/v1/resources/:id/return         - Return deployed resource
POST   /api/v1/resources/:id/maintenance    - Schedule maintenance

GET    /api/v1/resources/suggestions/optimal-deployment  - Get deployment suggestions
GET    /api/v1/resources/stats              - Get resource statistics
GET    /api/v1/resources/nearby             - Get nearby resources (geospatial)
```

## Frontend Components

### Pages
- **ResourceAllocationPage.jsx**: Main dashboard with tabs for Overview, Resources, and Deployments
  - Statistics overview with key metrics
  - Resource listing with filtering and search
  - Add/Edit resource form
  - Deployment history tracking

### Components
- **ResourceRequestComponent.jsx**: Reusable component for citizens to request resources when submitting complaints
  - Select resource types needed
  - Choose urgency level
  - Integration with complaint form
  - Clear summary of selected resources

## User Workflows

### Citizen Workflow
1. Submit Complaint → Optional: Select resource request types and urgency
2. System suggests optimal resources for deployment
3. Resources are allocated by public servant or mayor
4. Citizen receives notification when resources are deployed

### Public Servant (Department Officer) Workflow
1. View department resources in Resource Allocation Page
2. Can only deploy resources from their department
3. Update resource availability and status
4. Schedule maintenance for department resources
5. View department-specific statistics

### Mayor Workflow
1. Access complete Resource Allocation Dashboard
2. View city-wide resource inventory and utilization
3. Deploy any resource to any complaint
4. Create new resources for any department
5. View comprehensive statistics by department, type, and category
6. Monitor SLA compliance and resource efficiency

## Translation Support

### Implemented Languages
- **English (en)**
- **Bengali (bn)**

### Key Translated Strings
- Resource management labels (50+ strings)
- Resource request component (15+ strings)
- Deployment terms (20+ strings)
- Statistics labels (15+ strings)
- All UI buttons and messages

### Translation Optimization
- **Batch Processing**: Groups multiple translations together (up to 5 per batch)
- **Request Queuing**: Serializes requests with 50ms delays between batches
- **Improved Caching**: Persistent localStorage cache (v2) for better performance
- **Timeout Handling**: 3-second timeout on translation API calls
- **Fallback Support**: Returns original text if translation fails
- **Reduced Latency**: Batching reduces API calls by ~80% compared to single requests

## Technical Implementation Details

### Backend
- **Framework**: Express.js with Node.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with role-based middleware
- **Geospatial Queries**: MongoDB geospatial indexes for proximity searches
- **Automatic Calculations**: 
  - Complaint density analysis using haversine distance
  - Optimal resource matching algorithm
  - Utilization rate calculations
  - SLA tracking

### Frontend
- **Framework**: React with Vite
- **State Management**: Context API (AuthContext, LanguageContext)
- **UI Components**: Framer Motion for animations, Lucide icons
- **Map Integration**: Leaflet for geospatial visualization
- **API Client**: Axios with interceptors for JWT token management
- **Form Handling**: React state with validation

### Performance Optimizations
1. **Caching**: Multi-level caching (in-memory + localStorage)
2. **Batching**: Transaction batching for API requests
3. **Geospatial Indexing**: MongoDB indexes on coordinates
4. **Lazy Loading**: Components load only when tab is active
5. **Request Debouncing**: Minimized API calls through smart queuing

## Authorization & Security

### Permission Model
```
CITIZEN:
  - View resource allocation tab (read-only)
  - Request resources in complaint submission
  - Cannot deploy or manage resources

DEPARTMENT_OFFICER:
  - Create/Read/Update resources in own department
  - Cannot delete resources (admin only)
  - Can only deploy department's resources
  - View only own department statistics

MAYOR:
  - Full CRUD on all resources
  - Can deploy any resource to any complaint
  - View city-wide statistics
  - Access all features

ADMIN:
  - Full access (like mayor)
  - Can delete resources
```

### API Protection
- All endpoints require authentication (protect middleware)
- Role-based endpoint access control
- Resource ownership validation for updates
- Department-level isolation for officers

## File Structure

### Backend
```
backend/
├── models/
│   ├── Resource.model.js
│   └── Complaint.model.js (updated)
├── controllers/
│   └── resource.controller.js
├── routes/
│   └── resource.routes.js
└── server.js (updated with resource routes)
```

### Frontend
```
frontend/src/
├── pages/
│   ├── ResourceAllocationPage.jsx
│   └── MayorDashboard.jsx (updated)
├── components/
│   └── ResourceRequestComponent.jsx
├── services/
│   └── api.js (updated with resource API)
├── context/
│   └── LanguageContext.jsx (optimized)
└── translations/
    └── index.js (updated with resource strings)
```

## Testing Checklist

- [ ] Create resource (Mayor and Public Servant)
- [ ] Update resource availability
- [ ] Deploy resource to complaint
- [ ] Return deployed resource
- [ ] View resource statistics
- [ ] Get optimal deployment suggestions
- [ ] Test geospatial queries (nearby resources)
- [ ] Schedule maintenance
- [ ] Role-based access control
- [ ] Resource request in complaint
- [ ] Translations for all UI strings
- [ ] Translation API batching and caching
- [ ] Responsive design on mobile/tablet

## Future Enhancements

1. **Real-time GPS Tracking**: Live location updates for deployed resources
2. **Mobile App**: Native apps for resource managers
3. **Predictive Deployment**: ML-based prediction of resource needs
4. **Resource Sharing**: Multi-department resource sharing system
5. **Cost Tracking**: Detailed cost analysis and budgeting
6. **Advanced Analytics**: Dashboard with charts and graphs
7. **Automated Deployment**: Auto-deploy for critical complaints
8. **Resource Optimization**: ML-based optimal resource placement
9. **Integration**: SMS/WhatsApp notifications for deployments
10. **API Documentation**: OpenAPI/Swagger documentation

## Notes

- All coordinates use latitude/longitude (EPSG:4326)
- Distances calculated using haversine formula
- Complaint density determined by weighted priority analysis
- Resource availability updated atomically to prevent conflicts
- Deployment history is immutable (audit trail)
- Maintenance can only be scheduled for operational resources
