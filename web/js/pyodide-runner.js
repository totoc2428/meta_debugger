/**
 * Pyodide Runner - Execute Python code in the browser
 */

let pyodide = null;

// Python modules to inject
const DEBUGGER_MODULE = `
class Debugger:
    """Classe de débogage pour collecter les données."""
    method_calls = []
    attribute_accesses = []
    
    @classmethod
    def clear(cls):
        cls.method_calls.clear()
        cls.attribute_accesses.clear()
`;

const META_MODULE = `
import functools

class Meta(type):
    """Métaclasse qui collecte les accès aux attributs et appels de méthodes."""
    
    _INTERNAL_METHODS = frozenset({
        '__getattribute__', '__setattr__', '__delattr__',
        '__class__', '__dict__', '__doc__', '__module__',
        '__weakref__', '__slots__'
    })
    
    def __new__(mcs, name, bases, dct):
        cls = super().__new__(mcs, name, bases, dct)
        
        def logged_getattribute(self, attr_name):
            val = object.__getattribute__(self, attr_name)
            if attr_name not in Meta._INTERNAL_METHODS:
                Debugger.attribute_accesses.append({
                    'action': 'get',
                    'class': cls,
                    'attribute': attr_name,
                    'value': val
                })
            return val
        
        def logged_setattr(self, attr_name, value):
            Debugger.attribute_accesses.append({
                'action': 'set',
                'class': cls,
                'attribute': attr_name,
                'value': value
            })
            object.__setattr__(self, attr_name, value)
        
        cls.__getattribute__ = logged_getattribute
        cls.__setattr__ = logged_setattr
        
        for attr_name, attr_value in dct.items():
            if callable(attr_value) and not attr_name.startswith('__'):
                setattr(cls, attr_name, mcs._wrap_method(cls, attr_name, attr_value))
            elif attr_name == '__init__':
                setattr(cls, attr_name, mcs._wrap_method(cls, attr_name, attr_value))
        
        return cls
    
    @staticmethod
    def _wrap_method(cls, method_name, func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            Debugger.method_calls.append({
                'class': cls,
                'method': method_name,
                'args': args,
                'kwargs': kwargs
            })
            return func(*args, **kwargs)
        return wrapper
`;

const SERIALIZER_CODE = `
import json

def serialize_value(value):
    if isinstance(value, type):
        return {'__type__': 'class', 'name': value.__name__}
    elif isinstance(value, (str, int, float, bool, type(None))):
        return value
    elif isinstance(value, (list, tuple)):
        return [serialize_value(item) for item in value]
    elif isinstance(value, dict):
        return {str(k): serialize_value(v) for k, v in value.items()}
    elif hasattr(value, '__dict__'):
        return {'__type__': 'object', 'class': value.__class__.__name__, 'repr': repr(value)[:100]}
    else:
        return repr(value)[:100]

def serialize_debugger():
    return {
        'method_calls': [
            {
                'class': call['class'].__name__,
                'method': call['method'],
                'args': serialize_value(call['args']),
                'kwargs': serialize_value(call['kwargs'])
            }
            for call in Debugger.method_calls
        ],
        'attribute_accesses': [
            {
                'action': access['action'],
                'class': access['class'].__name__,
                'attribute': access['attribute'],
                'value': serialize_value(access['value'])
            }
            for access in Debugger.attribute_accesses
        ]
    }
`;

const AST_PARSER_CODE = `
import ast
import json

NODE_COLORS = {
    'Module': '#6c757d',
    'FunctionDef': '#0d6efd',
    'AsyncFunctionDef': '#0dcaf0',
    'ClassDef': '#6f42c1',
    'Return': '#dc3545',
    'Assign': '#198754',
    'AugAssign': '#20c997',
    'For': '#fd7e14',
    'While': '#fd7e14',
    'If': '#ffc107',
    'With': '#6610f2',
    'Try': '#d63384',
    'Call': '#e83e8c',
    'Name': '#adb5bd',
    'Constant': '#17a2b8',
    'Attribute': '#6ea8fe',
    'BinOp': '#ffda6a',
    'Compare': '#ffda6a',
    'BoolOp': '#ffda6a',
    'UnaryOp': '#ffda6a',
    'Lambda': '#0d6efd',
    'List': '#198754',
    'Dict': '#198754',
    'Tuple': '#198754',
    'Expr': '#a6adc8',
    'arguments': '#6c757d',
    'arg': '#89b4fa',
}

def node_to_dict(node):
    node_type = node.__class__.__name__
    result = {
        'type': node_type,
        'color': NODE_COLORS.get(node_type, '#adb5bd'),
    }
    
    if hasattr(node, 'lineno'):
        result['lineno'] = node.lineno
    if hasattr(node, 'col_offset'):
        result['col_offset'] = node.col_offset
    if hasattr(node, 'end_lineno'):
        result['end_lineno'] = node.end_lineno
    if hasattr(node, 'end_col_offset'):
        result['end_col_offset'] = node.end_col_offset
    
    children = []
    for field, value in ast.iter_fields(node):
        converted = convert_value(value)
        result[field] = converted
        
        if isinstance(value, ast.AST):
            children.append(converted)
        elif isinstance(value, list):
            for item in value:
                if isinstance(item, ast.AST):
                    children.append(node_to_dict(item))
    
    if children:
        result['children'] = children
    
    return result

def convert_value(value):
    if isinstance(value, ast.AST):
        return node_to_dict(value)
    elif isinstance(value, list):
        return [convert_value(item) for item in value]
    elif isinstance(value, (str, int, float, bool, type(None))):
        return value
    elif isinstance(value, bytes):
        return value.decode('utf-8', errors='replace')
    else:
        return str(value)

def parse_ast(source_code):
    try:
        tree = ast.parse(source_code)
        return json.dumps({
            'success': True,
            'ast': node_to_dict(tree),
            'error': None
        })
    except SyntaxError as e:
        return json.dumps({
            'success': False,
            'ast': None,
            'error': {
                'message': str(e.msg) if e.msg else str(e),
                'line': e.lineno,
                'column': e.offset
            }
        })
`;

/**
 * Initialize Pyodide
 * @param {Function} statusCallback - Callback to update status
 */
export async function initPyodide(statusCallback) {
  statusCallback("loading", "Chargement de Pyodide...");

  // Load Pyodide
  pyodide = await loadPyodide();

  statusCallback("loading", "Configuration des modules...");

  // Inject our modules
  await pyodide.runPythonAsync(DEBUGGER_MODULE);
  await pyodide.runPythonAsync(META_MODULE);
  await pyodide.runPythonAsync(SERIALIZER_CODE);
  await pyodide.runPythonAsync(AST_PARSER_CODE);

  // Setup stdout capture
  await pyodide.runPythonAsync(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.output = StringIO()
        self.error = StringIO()
    
    def capture(self):
        sys.stdout = self.output
        sys.stderr = self.error
    
    def release(self):
        sys.stdout = sys.__stdout__
        sys.stderr = sys.__stderr__
    
    def get_output(self):
        return self.output.getvalue()
    
    def get_error(self):
        return self.error.getvalue()
    
    def clear(self):
        self.output = StringIO()
        self.error = StringIO()

_output_capture = OutputCapture()
`);

  return pyodide;
}

/**
 * Run Python code and return results
 * @param {string} code - Python code to execute
 * @returns {Promise<{output: string, error: string, debugData: object}>}
 */
export async function runPythonCode(code) {
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  // Clear previous state
  await pyodide.runPythonAsync("Debugger.clear()");
  await pyodide.runPythonAsync("_output_capture.clear()");
  await pyodide.runPythonAsync("_output_capture.capture()");

  let output = "";
  let error = "";
  let debugData = { method_calls: [], attribute_accesses: [] };

  try {
    // Execute user code
    await pyodide.runPythonAsync(code);

    // Get output
    output = await pyodide.runPythonAsync("_output_capture.get_output()");
    error = await pyodide.runPythonAsync("_output_capture.get_error()");

    // Get debug data
    const debugJson = await pyodide.runPythonAsync(
      "json.dumps(serialize_debugger())",
    );
    debugData = JSON.parse(debugJson);
  } catch (e) {
    error = e.message;
  } finally {
    await pyodide.runPythonAsync("_output_capture.release()");
  }

  return { output, error, debugData };
}

/**
 * Parse code into AST
 * @param {string} code - Python code to parse
 * @returns {Promise<{success: boolean, ast: object, error: object}>}
 */
export async function parseAST(code) {
  if (!pyodide) {
    throw new Error("Pyodide not initialized");
  }

  // Escape the code for Python string
  const escapedCode = code
    .replace(/\\/g, "\\\\")
    .replace(/"""/g, '\\"\\"\\"')
    .replace(/\n/g, "\\n");

  const result = await pyodide.runPythonAsync(
    `parse_ast("""${escapedCode}""")`,
  );
  return JSON.parse(result);
}

/**
 * Get Pyodide instance
 * @returns {object}
 */
export function getPyodide() {
  return pyodide;
}
