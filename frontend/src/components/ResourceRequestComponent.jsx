import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Plus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useLanguage } from '../context/LanguageContext';

const RESOURCE_TYPES = ['Vehicle', 'Equipment', 'Officer', 'Staff', 'Machinery', 'Medical Supply', 'Communication Device'];
const URGENCY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

const ResourceRequestComponent = ({ value, onChange }) => {
  const { language, t } = useLanguage();
  const [showResourceForm, setShowResourceForm] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(value?.requestedResourceTypes || []);
  const [urgency, setUrgency] = useState(value?.requestedResourceUrgency || 'Medium');

  const handleToggleResourceType = (type) => {
    const updated = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];
    
    setSelectedTypes(updated);
    onChange({
      resourceRequest: updated.length > 0,
      requestedResourceTypes: updated,
      requestedResourceUrgency: urgency,
    });
  };

  const handleUrgencyChange = (newUrgency) => {
    setUrgency(newUrgency);
    onChange({
      resourceRequest: selectedTypes.length > 0,
      requestedResourceTypes: selectedTypes,
      requestedResourceUrgency: newUrgency,
    });
  };

  const handleClear = () => {
    setSelectedTypes([]);
    setUrgency('Medium');
    onChange({
      resourceRequest: false,
      requestedResourceTypes: [],
      requestedResourceUrgency: 'Medium',
    });
    setShowResourceForm(false);
  };

  return (
    <div className="space-y-3">
      {/* Resource Request Summary */}
      {selectedTypes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle size={20} className="text-blue-600" />
              <h4 className="font-semibold text-blue-900">
                {t('resourceRequestSummary') || 'Resource Request'}
              </h4>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-blue-200 rounded-lg transition"
            >
              <X size={16} className="text-blue-600" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Selected Resources */}
            <div>
              <p className="text-sm text-blue-700 mb-2">
                {t('requestedResources') || 'Requested Resources'}:
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedTypes.map(type => (
                  <motion.span
                    key={type}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-white border-2 border-blue-300 text-blue-700 rounded-full text-sm font-medium"
                  >
                    {type}
                    <button
                      type="button"
                      onClick={() => handleToggleResourceType(type)}
                      className="ml-1 hover:text-blue-900"
                    >
                      <X size={14} />
                    </button>
                  </motion.span>
                ))}
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <p className="text-sm text-blue-700 mb-2">
                {t('urgencyLevel') || 'Urgency Level'}:
              </p>
              <select
                value={urgency}
                onChange={e => handleUrgencyChange(e.target.value)}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-blue-900 font-medium"
              >
                {URGENCY_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <p className="text-xs text-blue-600 italic">
              {t('resourcesWillBeDeployed') || 'Available resources will be suggested for deployment'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Add/Edit Resource Request Button */}
      <button
        type="button"
        onClick={() => setShowResourceForm(!showResourceForm)}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
          selectedTypes.length > 0
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-300'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
        }`}
      >
        <Plus size={18} />
        {selectedTypes.length > 0 
          ? (t('editResourceRequest') || 'Edit Resource Request')
          : (t('requestResources') || 'Request Resources for Deployment (Optional)')}
      </button>

      {/* Resource Selection Modal */}
      <AnimatePresence>
        {showResourceForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border-2 border-blue-300 rounded-lg p-4 space-y-3"
          >
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertCircle size={18} className="text-blue-600" />
              {t('selectResourceTypes') || 'Select Resource Types Needed'}
            </h4>

            <div className="grid grid-cols-2 gap-2">
              {RESOURCE_TYPES.map(type => (
                <motion.button
                  key={type}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleToggleResourceType(type)}
                  className={`p-3 rounded-lg font-medium transition text-sm border-2 ${
                    selectedTypes.includes(type)
                      ? 'border-blue-600 bg-blue-100 text-blue-700'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  {type}
                </motion.button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('urgencyLevel') || 'Urgency Level'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCY_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => handleUrgencyChange(level)}
                    className={`p-2 rounded-lg font-medium transition text-sm border-2 ${
                      urgency === level
                        ? level === 'Critical'
                          ? 'border-red-600 bg-red-100 text-red-700'
                          : level === 'High'
                          ? 'border-orange-600 bg-orange-100 text-orange-700'
                          : level === 'Medium'
                          ? 'border-yellow-600 bg-yellow-100 text-yellow-700'
                          : 'border-blue-600 bg-blue-100 text-blue-700'
                        : 'border-gray-300 bg-gray-50 text-gray-700 hover:border-blue-400'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-gray-600 italic">
              {t('selectTypeDescription') || 'Select the types of resources you need. Our system will suggest optimal deployment options.'}
            </p>

            <button
              type="button"
              onClick={() => setShowResourceForm(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
            >
              {t('done') || 'Done'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResourceRequestComponent;
