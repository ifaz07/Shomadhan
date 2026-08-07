# Resource Allocation Tracker - Quick Setup Guide

## Branch
Working on: `resource_tracker` branch

## Backend Setup

### 1. Database Schema
The Resource model is already created with:
- Full CRUD operations
- Deployment history tracking
- Geospatial indexing for location queries
- Performance metrics

### 2. Start the Backend
```bash
cd backend
npm install  # if needed
npm run dev
```

Server runs on `http://localhost:5001`

### 3. API Endpoints Ready
All endpoints are registered at `/api/v1/resources`:
- POST   /resources              (Create)
- GET    /resources              (List with filters)
- GET    /resources/:id          (Get one)
- PUT    /resources/:id          (Update)
- DELETE /resources/:id          (Delete)
- POST   /resources/:id/deploy   (Deploy to complaint)
- POST   /resources/:id/return   (Return resource)
- GET    /resources/stats        (Statistics)
- GET    /resources/nearby       (Geospatial query)
- POST   /resources/:id/maintenance (Schedule maintenance)

## Frontend Setup

### 1. Start the Frontend
```bash
cd frontend
npm install  # if needed
npm run dev
```

Frontend runs on `http://localhost:5173`

### 2. Key Pages & Components
- **ResourceAllocationPage.jsx**: Main dashboard (tab in MayorDashboard)
- **ResourceRequestComponent.jsx**: Reusable component for complaint form
- **MayorDashboard.jsx**: Updated with Resource Allocation tab

### 3. Accessing the Feature

#### As Mayor:
1. Navigate to Mayor Dashboard
2. Click "Resource Allocation" tab
3. View Overview, Resources, and Deployments

#### As Public Servant (Department Officer):
1. Can only see their department's resources
2. Can deploy resources to complaints
3. View department-specific statistics

#### As Citizen:
1. When filing a complaint, an optional "Request Resources" section appears
2. Select needed resource types and urgency
3. Resources are suggested for deployment

## Quick Testing

### 1. Create a Resource (Mayor)
```bash
POST /api/v1/resources
{
  "name": "Fire Truck Alpha-1",
  "type": "Vehicle",
  "category": "Emergency Response",
  "description": "Quick response fire truck",
  "department": "dept_public_safety",
  "totalQuantity": 1,
  "baseLocation": {
    "latitude": 23.8103,
    "longitude": 90.4125,
    "address": "Fire Station, Dhaka"
  },
  "responseTime": 5,
  "priority": "critical"
}
```

### 2. Deploy Resource to Complaint (Mayor)
```bash
POST /api/v1/resources/:id/deploy
{
  "quantity": 1,
  "complaintId": "complaint_id_here"
}
```

### 3. Get Deployment Suggestions for Complaint
```bash
GET /api/v1/resources/suggestions/optimal-deployment?complaintId=complaint_id_here
```

### 4. Get Statistics
```bash
GET /api/v1/resources/stats
```

## Translation Testing

The system now supports:
- **English (en)**: Default language
- **Bengali (bn)**: Automatic translations

### Optimizations Implemented:
- ✅ Batch processing: Groups up to 5 translations per request
- ✅ Request queuing: Intelligently spaces out API calls (50ms between batches)
- ✅ Persistent caching: localStorage caches translations for reuse
- ✅ Timeout handling: 3-second timeout on API calls
- ✅ Fallback support: Returns original text if translation fails

## UI Features

### Resource Allocation Page
- **Overview Tab**: Statistics cards showing:
  - Total resources
  - Available resources
  - Deployed resources
  - Utilization rate
  - Operational count

- **Resources Tab**: 
  - List all resources with status
  - Edit/Delete buttons (role-based)
  - Add new resource button
  - Filters by status, type, category

- **Deployments Tab**: 
  - Coming soon - deployment history tracking

### Resource Request Component
When filing a complaint:
1. Optional "Request Resources" section
2. Multi-select resource types
3. Choose urgency level (Low, Medium, High, Critical)
4. Clear/Edit ability
5. Summary display

## File Locations

```
Backend:
- /backend/models/Resource.model.js
- /backend/controllers/resource.controller.js
- /backend/routes/resource.routes.js
- /backend/server.js (updated)

Frontend:
- /frontend/src/pages/ResourceAllocationPage.jsx
- /frontend/src/components/ResourceRequestComponent.jsx
- /frontend/src/pages/MayorDashboard.jsx (updated)
- /frontend/src/services/api.js (updated)
- /frontend/src/context/LanguageContext.jsx (optimized)
- /frontend/src/translations/index.js (updated with 70+ strings)
```

## Authorization Rules

### Public Servant (department_officer)
- ✅ Deploy their department's resources
- ✅ View their department's resources
- ✅ Update their department's resources
- ✅ See department statistics
- ❌ Deploy other departments' resources
- ❌ Delete resources

### Mayor
- ✅ Full CRUD on all resources
- ✅ Deploy any resource
- ✅ Delete resources
- ✅ View all statistics

### Citizen
- ✅ Request resources in complaints
- ✅ View resource status (read-only)
- ❌ Deploy or manage resources

## Common Issues & Solutions

### 1. Resource deployment fails with "Insufficient quantity"
- Check if `availableQuantity > quantity` requested
- Ensure resource status is "active"

### 2. Translation not loading
- Check browser console for API errors
- Verify MyMemory API is accessible
- Check localStorage cache size

### 3. Geospatial query returning no results
- Ensure resources have valid coordinates
- Verify latitude/longitude are proper numbers
- Check that radiusKm parameter is correct

### 4. Role-based access denied
- Verify user role in AuthContext
- Check department field matches resource department
- Ensure token is valid in localStorage

## Next Steps

1. **Test on resource_tracker branch**: 
   ```bash
   git checkout resource_tracker
   ```

2. **Deploy resources to complaints**: 
   - Create test complaint
   - Request resources
   - Deploy suggested resources

3. **Verify translations**: 
   - Toggle between English and Bengali
   - Check all UI strings translate properly

4. **Performance testing**: 
   - Monitor network requests
   - Verify translation batching reduces API calls
   - Check cache hit rates

5. **Mobile testing**: 
   - Test on various screen sizes
   - Verify form layout is responsive
   - Test touch interactions

## Support & Documentation

For more detailed information, see: **RESOURCE_ALLOCATION_IMPLEMENTATION.md**

Key sections:
- System Architecture
- Database Schema Details
- Complete API Reference
- User Workflows
- Authorization Model
- Testing Checklist
- Future Enhancements
