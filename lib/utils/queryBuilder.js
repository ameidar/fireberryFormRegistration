/**
 * Secure Query Builder for Fireberry API
 * Prevents SQL injection by properly escaping values and building safe queries
 */

class QueryBuilder {
  constructor() {
    this.conditions = [];
    this.operator = 'AND';
  }

  /**
   * Escape a value for safe inclusion in query strings
   * @param {any} value - The value to escape
   * @returns {string} - The escaped value
   */
  static escapeValue(value) {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    
    if (typeof value === 'string') {
      // Escape single quotes by doubling them (SQL standard)
      return `'${value.replace(/'/g, "''")}'`;
    }
    
    if (typeof value === 'number') {
      // Numbers are safe as-is, but validate they're actually numbers
      if (isNaN(value) || !isFinite(value)) {
        throw new Error('Invalid number value for query');
      }
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }
    
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    
    // For any other type, convert to string and escape
    return `'${String(value).replace(/'/g, "''")}'`;
  }

  /**
   * Validate field name to prevent injection through field names
   * @param {string} field - Field name to validate
   * @returns {string} - Validated field name
   */
  static validateField(field) {
    if (typeof field !== 'string') {
      throw new Error('Field name must be a string');
    }
    
    // Only allow alphanumeric characters, underscores, and dots
    if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
      throw new Error(`Invalid field name: ${field}`);
    }
    
    return field;
  }

  /**
   * Add an equality condition
   * @param {string} field - Field name
   * @param {any} value - Value to compare
   * @returns {QueryBuilder} - For chaining
   */
  equals(field, value) {
    const validField = QueryBuilder.validateField(field);
    const escapedValue = QueryBuilder.escapeValue(value);
    this.conditions.push(`${validField} = ${escapedValue}`);
    return this;
  }

  /**
   * Add an IN condition for multiple values
   * @param {string} field - Field name
   * @param {Array} values - Array of values
   * @returns {QueryBuilder} - For chaining
   */
  in(field, values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error('IN condition requires non-empty array of values');
    }
    
    const validField = QueryBuilder.validateField(field);
    const escapedValues = values.map(value => QueryBuilder.escapeValue(value));
    this.conditions.push(`${validField} IN (${escapedValues.join(', ')})`);
    return this;
  }

  /**
   * Add a LIKE condition
   * @param {string} field - Field name
   * @param {string} pattern - Pattern to match
   * @returns {QueryBuilder} - For chaining
   */
  like(field, pattern) {
    const validField = QueryBuilder.validateField(field);
    const escapedPattern = QueryBuilder.escapeValue(pattern);
    this.conditions.push(`${validField} LIKE ${escapedPattern}`);
    return this;
  }

  /**
   * Add a greater than condition
   * @param {string} field - Field name
   * @param {any} value - Value to compare
   * @returns {QueryBuilder} - For chaining
   */
  greaterThan(field, value) {
    const validField = QueryBuilder.validateField(field);
    const escapedValue = QueryBuilder.escapeValue(value);
    this.conditions.push(`${validField} > ${escapedValue}`);
    return this;
  }

  /**
   * Add a less than condition
   * @param {string} field - Field name
   * @param {any} value - Value to compare
   * @returns {QueryBuilder} - For chaining
   */
  lessThan(field, value) {
    const validField = QueryBuilder.validateField(field);
    const escapedValue = QueryBuilder.escapeValue(value);
    this.conditions.push(`${validField} < ${escapedValue}`);
    return this;
  }

  /**
   * Set the logical operator between conditions
   * @param {string} op - 'AND' or 'OR'
   * @returns {QueryBuilder} - For chaining
   */
  setOperator(op) {
    if (op !== 'AND' && op !== 'OR') {
      throw new Error('Operator must be AND or OR');
    }
    this.operator = op;
    return this;
  }

  /**
   * Add a custom condition (use with caution - ensure input is validated)
   * @param {string} condition - Pre-validated condition string
   * @returns {QueryBuilder} - For chaining
   */
  custom(condition) {
    if (typeof condition !== 'string' || condition.trim() === '') {
      throw new Error('Custom condition must be a non-empty string');
    }
    this.conditions.push(condition);
    return this;
  }

  /**
   * Build the final query string
   * @returns {string} - The safe query string
   */
  build() {
    if (this.conditions.length === 0) {
      return '';
    }
    
    if (this.conditions.length === 1) {
      return this.conditions[0];
    }
    
    return `(${this.conditions.join(` ${this.operator} `)})`;
  }

  /**
   * Reset the builder for reuse
   * @returns {QueryBuilder} - For chaining
   */
  reset() {
    this.conditions = [];
    this.operator = 'AND';
    return this;
  }
}

/**
 * Helper functions for common query patterns
 */
const QueryHelpers = {
  /**
   * Build a safe email lookup query
   * @param {string} email - Email to search for
   * @returns {string} - Safe query string
   */
  emailLookup(email) {
    return new QueryBuilder().equals('emailaddress1', email).build();
  },

  /**
   * Build a safe phone lookup query
   * @param {string} phoneNumber - Phone number to search for
   * @returns {string} - Safe query string
   */
  phoneLookup(phoneNumber) {
    return new QueryBuilder().equals('telephone1', phoneNumber).build();
  },

  /**
   * Build a safe cycle lookup query
   * @param {string} cycleId - Cycle ID to search for
   * @returns {string} - Safe query string
   */
  cycleLookup(cycleId) {
    return new QueryBuilder().equals('pcfsystemfield53', cycleId).build();
  },

  /**
   * Build a safe multiple account IDs lookup
   * @param {Array<string>} accountIds - Account IDs to search for
   * @returns {string} - Safe query string
   */
  multipleAccountsLookup(accountIds) {
    if (!Array.isArray(accountIds) || accountIds.length === 0) {
      throw new Error('Account IDs must be a non-empty array');
    }
    return new QueryBuilder().in('accountid', accountIds).build();
  },

  /**
   * Build a safe multiple cycles lookup
   * @param {Array<string>} cycleIds - Cycle IDs to search for
   * @returns {string} - Safe query string
   */
  multipleCyclesLookup(cycleIds) {
    if (!Array.isArray(cycleIds) || cycleIds.length === 0) {
      throw new Error('Cycle IDs must be a non-empty array');
    }
    return new QueryBuilder().in('pcfsystemfield53', cycleIds).build();
  },

  /**
   * Build active cycles query
   * @returns {string} - Safe query string
   */
  activeCycles() {
    return new QueryBuilder().equals('pcfsystemfield37', 3).build();
  }
};

module.exports = { QueryBuilder, QueryHelpers };