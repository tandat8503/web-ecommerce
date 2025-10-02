import { useState, useEffect } from 'react';

/**
 * Custom hook để load select options cho dropdowns
 * @param {Array} apiCalls - Array các API calls để load options
 * @param {Object} options - Options cho hook
 * @returns {Object} Hook state và functions
 */
export const useSelectOptions = (apiCalls = [], options = {}) => {
  const {
    dependencies = [],
    enabled = true
  } = options;

  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOptions = async () => {
    if (!enabled || apiCalls.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const results = await Promise.all(apiCalls);
      
      const newOptions = {};
      apiCalls.forEach((apiCall, index) => {
        const key = apiCall.key || `option${index}`;
        newOptions[key] = results[index].data.data || [];
      });
      
      setOptions(newOptions);
    } catch (err) {
      setError(err);
      console.error('Error fetching select options:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptions();
  }, dependencies);

  return {
    options,
    loading,
    error,
    refetch: fetchOptions
  };
};
