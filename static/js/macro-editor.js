let blocklyArea = document.querySelector("#blocklyArea");
let blocklyDiv = document.querySelector("#blocklyDiv");
let invisibleWorkspace = document.querySelector("#invisibleWorkspace");
let macroDiv = document.querySelector("#macroDiv");
let fileDiv = document.querySelector("#fileDiv");

let blockView = document.querySelector('#blockView');
let macroView = document.querySelector('#macroView');
let fileView = document.querySelector('#fileView');

let macro_list = document.querySelector("#macro-list");

let get_macro_id = (macro) => {
  let lines = macro.split("\n");
  for (let line of lines){
    let first = line.indexOf("MACRO_DEFINE(\"");
    if(first != -1){
      let second = line.lastIndexOf("\")");
      return line.substring(first + "MACRO_DEFINE(\"".length, second);
    }
  }
  return "";
};

let workspace;

const socket = io();

let workspaces = [];
let curr_index = -1;

const Order = {
  ATOMIC: 0
};

macro_list.innerHTML = `<a class="dropdown-item" id="new" onClick="macro_select(this.id)" href="#"><i class="fa fa-plus"></i>New Macro</a>`;

blockView.onclick = () => {
  macroDiv.hidden = true;
  fileDiv.hidden = true;
  blocklyArea.hidden = false;
}

macroView.onclick = () => {
  fileDiv.hidden = true;
  blocklyArea.hidden = true;
  macroDiv.innerHTML = "<pre><code>" + macroGenerator.workspaceToCode(workspace) + "</code></pre>";
  macroDiv.hidden = false;
}

let macroGenerator = new Blockly.CodeGenerator('Macro');

macroGenerator.scrub_ = function(block, code, thisOnly){
  const nextBlock =
      block.nextConnection && block.nextConnection.targetBlock();
  if (nextBlock && !thisOnly) {
    return code + '\n' + macroGenerator.blockToCode(nextBlock);
  }
  return code;
};

macroGenerator.forBlock['definemacro'] = function(block, generator){
  return 'MACRO_DEFINE(' + block.getFieldValue('id') + ')';
};

macroGenerator.forBlock['num'] = function(block, generator){
  return [block.getFieldValue('num') || '0', Order.ATOMIC];
};

macroGenerator.forBlock['true'] = function(block){
  return ['TRUE()', Order.ATOMIC];
};

macroGenerator.forBlock['false'] = function(block){
  return ['FALSE()', Order.ATOMIC];
};

macroGenerator.forBlock['not'] = function(block, generator){
  return ['NOT(' + generator.valueToCode(block, 'val', Order.ATOMIC) + ')', Order.ATOMIC];
}

macroGenerator.forBlock['mathexpression'] = function(block, generator){
  let i = 0;
  let ret = 'EXPR(';
  while(block.getInput('operator_input_' + i)){
    ret += generator.valueToCode(block, 'operand' + i, Order.ATOMIC) + ' ' + block.getFieldValue('operator' + i) + ' ';
    i++;
  }
  ret += generator.valueToCode(block, 'operand' + i, Order.ATOMIC) + ')';
  return [ret, Order.ATOMIC];
};

macroGenerator.forBlock['logicalexpression'] = function(block, generator){
  let i = 0;
  let ret = 'GROUP(';
  while(block.getInput('operator_input_' + i)){
    ret += generator.valueToCode(block, 'operand' + i, Order.ATOMIC) + ' ' + block.getFieldValue('operator' + i) + ' ';
    i++;
  }
  ret += generator.valueToCode(block, 'operand' + i, Order.ATOMIC) + ')';
  return [ret, Order.ATOMIC];
};

macroGenerator.forBlock['comparison'] = function(block, generator){
  if(block.getFieldValue('operator') == 'lessthan')
    return ['LESS_THAN(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
  else if(block.getFieldValue('operator') == 'greaterthan')
    return ['GREATER_THAN(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
  else if(block.getFieldValue('operator') == 'lessthanorequal')
    return ['LESS_THAN_OR_EQUAL(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
  else if(block.getFieldValue('operator') == 'greaterthanorequal')
    return ['GREATER_THAN_OR_EQUAL(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
  else if(block.getFieldValue('operator') == 'equal')
    return ['EQUAL(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
  else if(block.getFieldValue('operator') == 'notequal')
    return ['NOT_EQUAL(' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'lhs', Order.ATOMIC) + ')', Order.ATOMIC];
};

macroGenerator.forBlock['function'] = function(block, generator){
  let ret = '';
  if(block.getFieldValue('fn') == 'abs')
    ret += 'ABS(';
  else if(block.getFieldValue('fn') == 'sin')
    ret += 'SIN(';
  else if(block.getFieldValue('fn') == 'cos')
    ret += 'COS(';
  else if(block.getFieldValue('fn') == 'tan')
    ret += 'TAN(';
  else if(block.getFieldValue('fn') == 'ceil')
    ret += 'CEIL(';
  else if(block.getFieldValue('fn') == 'floor')
    ret += 'FLOOR(';
  else if(block.getFieldValue('fn') == 'round')
    ret += 'ROUND(';
  ret += generator.valueToCode(block, 'val', Order.ATOMIC) + ')';
  return [ret, Order.ATOMIC];
};

macroGenerator.forBlock['atan2'] = function(block, generator){
  return ['ATAN2(' + generator.valueToCode(block, 'first', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'second', Order.ATOMIC) + ')', Order.ATOMIC];
}

macroGenerator.forBlock['if'] = function(block, generator){
  let ret = 'IF(';
  ret += generator.valueToCode(block, 'if', Order.ATOMIC) + '){\n' + generator.statementToCode(block, 'if_body') + '\n}';
  let i = 0;
  while(block.getInput('elseif' + i)){
    ret += '\nELSEIF(' + generator.valueToCode(block, 'elseif' + i, Order.ATOMIC) + '){\n' + generator.statementToCode(block, 'elseif_body' + i, Order.ATOMIC) + '\n}';
    i++;
  }
  if(block.getInput('else'))
    ret += '\nELSE{\n' + generator.statementToCode(block, 'else_body', Order.ATOMIC) + '\n}';
  return ret;
};

macroGenerator.forBlock['while'] = function(block, generator){
  return 'WHILE(' + generator.valueToCode(block, 'statement', Order.ATOMIC) + '){\n' + generator.statementToCode(block, 'body') + '\n}';
};

macroGenerator.forBlock['drive_to_point'] = function(block){
  if(block.getField('async'))
    return 'DRIVE_TO_ASYNC(' + block.getFieldValue('x') + ', ' + block.getFieldValue('y') + ')';
  else
    return 'DRIVE_TO(' + block.getFieldValue('x') + ', ' + block.getFieldValue('y') + ')';
};

macroGenerator.forBlock['turn_to_point'] = function(block){
  if(block.getField('async'))
    return 'TURN_TO_ASYNC(' + block.getFieldValue('x') + ', ' + block.getFieldValue('y') + ')';
  else
    return 'TURN_TO(' + block.getFieldValue('x') + ', ' + block.getFieldValue('y') + ')';
};

macroGenerator.forBlock['moveposition'] = function(block, generator){
  return 'MOVE_DEG(\"' + block.getFieldValue('motorgroup') + '\", ' + generator.valueToCode(block, 'degrees', Order.ATOMIC) + ', ' + generator.valueToCode(block, 'velocity', Order.ATOMIC) + ')';
};

macroGenerator.forBlock['movepid'] = function(block, generator){
  return 'MOVE_PID(\"' + block.getFieldValue('motorgroup') + '\", ' + generator.valueToCode(block, 'degrees', Order.ATOMIC) + ')';
};

macroGenerator.forBlock['movevoltage'] = function(block, generator){
  return 'MOVE_VOLTAGE(\"' + block.getFieldValue('motorgroup') + '\", ' + generator.valueToCode(block, 'voltage', Order.ATOMIC) + ')';
};

macroGenerator.forBlock['xposition'] = function(block){
  return ['CHASSIS_X()', Order.ATOMIC];
};

macroGenerator.forBlock['yposition'] = function(block){
  return ['CHASSIS_Y()', Order.ATOMIC];
};

macroGenerator.forBlock['heading'] = function(block){
  return ['CHASSIS_HEADING()', Order.ATOMIC];
};

macroGenerator.forBlock['controllerpress'] = function(block){
  return ['CONTROLLER_PRESSED(' + block.getFieldValue('button') + ')', Order.ATOMIC];
};

macroGenerator.forBlock['motorvoltage'] = function(block){
  return ['MOTOR_VOLTAGE(\"' + block.getFieldValue('motorgroup') + '\")', Order.ATOMIC];
};

macroGenerator.forBlock['motorposition'] = function(block){
  return ['MOTOR_POSITION(\"' + block.getFieldValue('motorgroup') + '\")', Order.ATOMIC];
};

macroGenerator.forBlock['distfrompoint'] = function(block, generator){
  return ['DISTANCE_FROM_POINT(' + block.getFieldValue('x') + ', ' + block.getFieldValue('y') + ')', Order.ATOMIC];
};

macroGenerator.forBlock['timesincestart'] = function(block){
  return['TIME_SINCE_START()', Order.ATOMIC];
};

macroGenerator.forBlock['timesinceexecution'] = function(block){
  return['TIME_SINCE_EXECUTION()', Order.ATOMIC];
};

macroGenerator.forBlock['timewait'] = function(block, generator){
  return 'TIME_WAIT(' + generator.valueToCode(block, 'val', Order.ATOMIC) + ')';
};

macroGenerator.forBlock['chassiswait'] = function(block){
  return 'CHASSIS_WAIT()';
};

macroGenerator.forBlock['ppwait'] = function(block){
  return 'PP_WAIT()';
};

Blockly.Extensions.registerMixin(
  'var_get_mixin',
  {
    
  }
)

Blockly.Extensions.registerMutator(
  'if_else_mutator',
  {
    else_if_count_: 0,
    else_condition_: false,

    saveExtraState(){
      return {
        "else_if_count": this.else_if_count_,
        "else_condition": this.else_condition_
      };
    },

    loadExtraState(state){
      this.updateShape_(state["else_if_count"], state["else_condition"]);
    },

    mutationToDom(){
      let i = 0;
      let container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('else_if_count', this.else_if_count_);
      container.setAttribute('else_condition', this.else_condition_);
      return container;
    },

    domToMutation(xmlElement) {
      let else_if_count = parseInt(xmlElement.getAttribute('else_if_count'), 10);
      let else_condition = ((xmlElement.getAttribute('else_condition') == 'TRUE') ? true : false);
      this.updateShape_(else_if_count, else_condition);
    },

    decompose(workspace) {
      let block = workspace.newBlock('elseselector');
      block.initSvg();
      block.setFieldValue(this.else_if_count_, 'elseifcount');
      block.setFieldValue(this.else_condition_, 'elsecondition');
      return block;
    },

    compose(topBlock){
      let else_if_count = topBlock.getFieldValue('elseifcount');
      let else_condition = ((topBlock.getFieldValue('elsecondition') == 'TRUE') ? true : false);
      this.updateShape_(else_if_count, else_condition);
    },

    updateShape_(new_count, new_condition){
      let i = 0;
      if(this.else_condition_){
        this.removeInput('else');
        this.removeInput('else_body');
      }
      for(i = this.else_if_count_; i < new_count; i++){
        this.appendDummyInput('elseiftext' + i)
          .appendField(new Blockly.FieldLabel('else if'));
        this.appendValueInput('elseif' + i)
          .setCheck('Boolean');
        this.appendStatementInput('elseif_body' + i);
      }
      for(i = this.else_if_count_ - 1; i >= new_count; i--){
        this.removeInput('elseif' + i);
        this.removeInput('elseiftext' + i);
        this.removeInput('elseif_body' + i);
      }
      if(new_condition){
        this.appendDummyInput('else')
          .appendField(new Blockly.FieldLabel('else'));
        this.appendStatementInput('else_body');
      }
      this.else_if_count_ = new_count;
      this.else_condition_ = new_condition;
    }
  },
  function(){ this.updateShape_(0, false); },
  []
)

Blockly.Extensions.registerMutator(
  'math_expr_mutator',
  {
    operands_: 0,

    saveExtraState(){
      return {
        "operands": this.operands_,
      };
    },

    loadExtraState(state){
      this.updateShape_(state['operands']);
    },

    mutationToDom() {
      let i = 0;
      let container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('operands', this.operands_);
      return container;
    },
    
    domToMutation(xmlElement) {
      this.updateShape_(parseInt(xmlElement.getAttribute('operands'), 10));
    },
    
    decompose(workspace){
      let block = workspace.newBlock('operandcount_block');
      block.initSvg();
      block.setFieldValue(this.operands_, 'operandcount');
      return block;
    },

    compose(topBlock){
      let operands = topBlock.getFieldValue('operandcount');
      if(operands <= 0)
        operands = 1;
      this.updateShape_(operands);
    },

    updateShape_(new_operands){
      let i = 0;

      if(this.operands_ > new_operands){
        for(i = this.operands_ - 1; i >= new_operands; i--){
          this.removeInput('operand' + i);
          this.removeInput('operator_input_' + (i - 1));
        }
      }

      else{
        let dom = Blockly.utils.xml.textToDom(
          '<xml>' +
          '  <shadow type="num"></shadow>' +
          '</xml>').children[0];

        for(i = this.operands_; i < new_operands; i++){
          if(this.inputList.length > 0){
            this.appendDummyInput('operator_input_' + (i-1))
              .appendField(new Blockly.FieldDropdown([
                ['+', '+'],
                ['-', '-'],
                ['*', '*'],
                ['/', '/'],
                ['%', '%'],
                ['^', '^'],
            ]), 'operator' + (i-1));
            this.appendValueInput('operand' + i)
              .setCheck('Number')
              .setShadowDom(dom);
          }
          else{
            this.appendValueInput('operand' + i)
              .setCheck('Number')
              .setShadowDom(dom);
          }
        }
      }
      this.operands_ = new_operands;
    },
  },
  function(){
    this.updateShape_(2);
  },
  []
);

Blockly.Extensions.registerMutator(
  'logic_expr_mutator',
  {
    operands_: 0,

    saveExtraState(){
      return {
        "operands": this.operands_,
      };
    },

    loadExtraState(state){
      this.updateShape_(state['operands']);
    },

    mutationToDom() {
      let i = 0;
      let container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('operands', this.operands_);
      return container;
    },
    
    domToMutation(xmlElement) {
      let i = 0;
      this.updateShape_(parseInt(xmlElement.getAttribute('operands'), 10));
    },
    
    decompose(workspace){
      let block = workspace.newBlock('operandcount_block');
      block.initSvg();
      block.setFieldValue(this.operands_, 'operandcount');
      return block;
    },

    compose(topBlock){
      let operands = topBlock.getFieldValue('operandcount');
      if(operands > 0)
        this.updateShape_(operands);
    },

    updateShape_(new_operands){
      let i = 0;

      if(this.operands_ > new_operands){
        for(i = this.operands_ - 1; i >= new_operands; i--){
          this.removeInput('operand' + i);
          this.removeInput('operator_input_' + (i - 1));
        }
      }

      else{
        for(i = this.operands_; i < new_operands; i++){
          if(this.inputList.length > 0){
            this.appendDummyInput('operator_input_' + (i-1))
              .appendField(new Blockly.FieldDropdown([
                ['and', '&'],
                ['or', '|']
            ]), 'operator' + (i-1));
            this.appendValueInput('operand' + i)
              .setCheck('Boolean');
          }
          else{
            this.appendValueInput('operand' + i)
              .setCheck('Boolean');
          }
        }
      }
      this.operands_ = new_operands;
    },
  },
  function(){
    this.updateShape_(2);
  },
  []
);

Blockly.Extensions.registerMutator(
  'async_mutator',
  {
    async_: false,

    saveExtraState(){
      return {
        "async": this.async_
      };
    },

    loadExtraState(state){
      this.updateShape_(state['async']);
    },

    mutationToDom() {
      let container = Blockly.utils.xml.createElement('mutation');
      container.setAttribute('async', this.async_);
      return container;
    },
    
    domToMutation(xmlElement) {
      let a = ((xmlElement.getAttribute('async') == 'TRUE') ? true : false);
      this.updateShape_(a);
    },
    
    decompose(workspace){
      let block = workspace.newBlock('async_selector');
      block.initSvg();
      block.setFieldValue(this.async_, 'async');
      return block;
    },

    compose(topBlock){
      let a = ((topBlock.getFieldValue('async') == 'TRUE') ? true : false);
      this.updateShape_(a);
    },

    updateShape_(new_async){
      if(this.async_)
        this.inputList[0].removeField('async');
      if(new_async)
        this.inputList[0].appendField(new Blockly.FieldLabel(' (Async)'), 'async');
      this.async_ = new_async;
    }
  },
  function(){
    this.updateShape_(false);
  },
  []
);

const blocks = Blockly.defineBlocksWithJsonArray([
  {
    "type": "num",
    "message0": "%1",
    "args0": [
      {
        "type": "field_number",
        "name": "num",
        "value": 0
      }
    ],
    "output": null,
    "colour": 230,
    "tooltip": "",
    "helpUrl": ""
  },
  {
  "type": "while",
  "message0": "while %1 %2",
  "args0": [
    {
      "type": "input_value",
      "name": "statement",
      "check": "Boolean",
      "align": "RIGHT"
    },
    {
      "type": "input_statement",
      "name": "body"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "style": "control_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "setvar",
  "message0": "%1  = %2 %3",
  "args0": [
    {
      "type": "field_input",
      "name": "var",
      "text": "var"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "val",
      "check": "Number"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "getvar",
  "message0": "var %1",
  "args0": [
    {
      "type": "field_variable",
      "name": "var",
      "variable": "%{BKY_VARIABLES_DEFAULT_NAME}"
    }
  ],
  "inputsInline": true,
  "output": "Number",
  "style": "variable_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "not",
  "message0": "Not %1",
  "args0": [
    {
      "type": "input_value",
      "name": "val",
      "check": "Boolean"
    }
  ],
  "output": "Boolean",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "atan2",
  "message0": "atan2( %1 %2 ,  %3 %4 )",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "first",
      "check": "Number"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "second",
      "check": "Number"
    }
  ],
  "output": "Number",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "logicalexpression",
  "message0": "",
  "extraState": {
    'operands': 0
  },
  "mutator": "logic_expr_mutator",
  "output": "Boolean",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "comparison",
  "message0": "%1 %2 %3 %4",
  "args0": [
    {
      "type": "input_value",
      "name": "lhs",
      "check": "Number"
    },
    {
      "type": "field_dropdown",
      "name": "operator",
      "options": [
        [
          "<",
          "lessthan"
        ],
        [
          ">",
          "greaterthan"
        ],
        [
          "<=",
          "lessthanorequal"
        ],
        [
          ">=",
          "greaterthanorequal"
        ],
        [
          "==",
          "equal"
        ],
        [
          "!=",
          "notequal"
        ]
      ]
    },
    {
      "type": "input_dummy",
      "align": "CENTRE"
    },
    {
      "type": "input_value",
      "name": "rhs",
      "check": "Number",
      "align": "RIGHT"
    }
  ],
  "output": "Boolean",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "operandcount_block",
  "message0": "Number of Operands (Numbers) %1",
  "args0": [
    {
      "type": "field_number",
      "name": "operandcount",
      "value": 2,
      "min": 1
    }
  ],
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "distfrompoint",
  "message0": "Distance From Point ( %1 ,  %2 )",
  "args0": [
    {
      "type": "field_number",
      "name": "x",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    },
    {
      "type": "field_number",
      "name": "y",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    }
  ],
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "mathexpression",
  "extraState": {
    'operands': 0
  },
  "message0": "",
  "mutator": "math_expr_mutator",
  "inputsInline": true,
  "output": "Number",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "if",
  "message0": "if %1 %2",
  "args0": [
    {
      "type": "input_value",
      "name": "if",
      "check": "Boolean",
      "align": "RIGHT"
    },
    {
      "type": "input_statement",
      "name": "if_body"
    }
  ],
  "extraState": {
    "else_if_count": 0,
    "else_condition": false
  },
  "mutator": "if_else_mutator",
  "previousStatement": null,
  "nextStatement": null,
  "style": "control_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "elseselector",
  "message0": "Else-If Conditions:  %1 %2 Else? %3",
  "args0": [
    {
      "type": "field_number",
      "name": "elseifcount",
      "value": 0,
      "min": 0
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "field_checkbox",
      "name": "elsecondition",
      "checked": false
    }
  ],
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "drive_to_point",
  "message0": "Drive To Point( %1 ,  %2 )",
  "args0": [
    {
      "type": "field_number",
      "name": "x",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    },
    {
      "type": "field_number",
      "name": "y",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    }
  ],
  "extraState": {
    "async": false
  },
  "mutator": "async_mutator",
  "previousStatement": null,
  "nextStatement": null,
  "style": "motion_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "turn_to_point",
  "message0": "Turn To Point( %1 ,  %2 )",
  "args0": [
    {
      "type": "field_number",
      "name": "x",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    },
    {
      "type": "field_number",
      "name": "y",
      "value": 0,
      "min": 0,
      "max": 144,
      "precision": 0.01
    }
  ],
  "extraState": {
    "async": false
  },
  "mutator": "async_mutator",
  "previousStatement": null,
  "nextStatement": null,
  "style": "motion_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "async_selector",
  "message0": "Async? %1",
  "args0": [
    {
      "type": "field_checkbox",
      "name": "async",
      "checked": false
    }
  ],
  "colour": 230,
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "function",
  "implicitAlign0": "RIGHT",
  "message0": "%1 %2 %3 )",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "fn",
      "options": [
        [
          "abs(",
          "abs"
        ],
        [
          "sin(",
          "sin"
        ],
        [
          "cos(",
          "cos"
        ],
        [
          "tan(",
          "tan"
        ],
        [
          "floor(",
          "floor"
        ],
        [
          "ceil(",
          "ceil"
        ],
        [
          "round(",
          "round"
        ]
      ]
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "val",
      "check": "Number",
      "align": "CENTRE"
    }
  ],
  "output": "Number",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "xposition",
  "message0": "Chassis Position (x)",
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "yposition",
  "message0": "Chassis Position (y)",
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "heading",
  "message0": "Chassis Heading",
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "motorposition",
  "message0": "%1 Position",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "motorgroup",
      "options": [
        [
          "[MOTOR GROUP]",
          "default"
        ]
      ]
    }
  ],
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "motorvoltage",
  "message0": "%1 Voltage",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "motorgroup",
      "options": [
        [
          "[MOTOR GROUP]",
          "default"
        ]
      ]
    }
  ],
  "output": "Number",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "true",
  "message0": "True",
  "output": "Boolean",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "false",
  "message0": "False",
  "output": "Boolean",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "moveposition",
  "message0": "Move Motor %1 for %2 %3 degrees at  %4 %5 RPM",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "motorgroup",
      "options": [
        [
          "[MOTOR GROUP]",
          "default"
        ]
      ]
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "degrees",
      "check": "Number",
      "align": "CENTRE"
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "velocity",
      "check": "Number",
      "align": "CENTRE"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "motion_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "movevoltage",
  "message0": "Move Motor %1 at %2 %3 mV",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "motorgroup",
      "options": [
        [
          "[MOTOR GROUP]",
          "default"
        ]
      ]
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "voltage",
      "check": "Number"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "style": "motion_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "movepid",
  "message0": "Move Motor %1 for %2 %3 degrees (PID)",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "motorgroup",
      "options": [
        [
          "[MOTOR GROUP]",
          "default"
        ]
      ]
    },
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "degrees",
      "check": "Number"
    }
  ],
  "previousStatement": null,
  "nextStatement": null,
  "style": "motion_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "controllerpress",
  "message0": "Controller Button %1 is Pressed",
  "args0": [
    {
      "type": "field_dropdown",
      "name": "button",
      "options": [
        [
          "L1",
          "L1"
        ],
        [
          "L2",
          "L2"
        ],
        [
          "R1",
          "R1"
        ],
        [
          "R2",
          "R2"
        ],
        [
          "Up",
          "UP"
        ],
        [
          "Down",
          "DOWN"
        ],
        [
          "Left",
          "LEFT"
        ],
        [
          "Right",
          "RIGHT"
        ],
        [
          "X",
          "X"
        ],
        [
          "B",
          "B"
        ],
        [
          "Y",
          "Y"
        ],
        [
          "A",
          "A"
        ]
      ]
    }
  ],
  "output": "Boolean",
  "style": "sensing_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "definemacro",
  "message0": "Define Macro %1",
  "args0": [
    {
      "type": "field_input",
      "name": "id",
      "text": "Enter ID"
    }
  ],
  "inputsInline": true,
  "nextStatement": null,
  "style": "event_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "negative",
  "message0": "- %1",
  "args0": [
    {
      "type": "input_value",
      "name": "val",
      "check": "Number"
    }
  ],
  "output": "Number",
  "style": "operator_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "timesincestart",
  "message0": "Time Since Control Start",
  "output": "Number",
  "style": "time_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "timesinceexecution",
  "message0": "Time Since Macro Execution",
  "output": "Number",
  "style": "time_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "timewait",
  "message0": "Wait for %1 %2 ms",
  "args0": [
    {
      "type": "input_dummy"
    },
    {
      "type": "input_value",
      "name": "val",
      "check": "Number",
      "align": "CENTRE"
    }
  ],
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "time_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "chassiswait",
  "message0": "Wait for Chassis",
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "time_block",
  "tooltip": "",
  "helpUrl": ""
},
{
  "type": "ppwait",
  "message0": "Wait for Pure Pursuit",
  "inputsInline": true,
  "previousStatement": null,
  "nextStatement": null,
  "style": "time_block",
  "tooltip": "",
  "helpUrl": ""
}]);

let toolbox = {
  "kind": "categoryToolbox",
  "contents": [
    {
      "kind": "category",
      "name": "Events",
      "categorystyle": "event",
      "contents": [
        {
          "kind": "block",
          "type": "definemacro"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Motion",
      "categorystyle": "motion",
      "contents": [
        {
          "kind": "label",
          "text": "Odometry"
        },
        {
          "kind": "block",
          "type": "turn_to_point",
        },
        {
          "kind": "block",
          "type": "drive_to_point",
        },
        {
          "kind": "sep"
        },
        {
          "kind": "label",
          "text": "Motor"
        },
        {
          "kind": "block",
          "type": "moveposition",
          "inputs": {
            "degrees": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            },
            "velocity": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "movepid",
          "inputs": {
            "degrees": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "movevoltage",
          "inputs": {
            "voltage": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        }
      ]
    },
    {
      "kind": "category",
      "name": "Time",
      "categorystyle": "time",
      "contents": [
        {
          "kind": "label",
          "text": "Values"
        },
        {
          "kind": "block",
          "type": "timesincestart"
        },
        {
          "kind": "block",
          "type": "timesinceexecution"
        },
        {
          "kind": "label",
          "text": "Waiting"
        },
        {
          "kind": "block",
          "type": "timewait",
          "inputs": {
            "val": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "chassiswait"
        },
        {
          "kind": "block",
          "type": "ppwait"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Control",
      "categorystyle": "control",
      "contents": [
        {
          "kind": "block",
          "type": "if",
        },
        {
          "kind": "block",
          "type": "while"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Operators",
      "categorystyle": "operator",
      "contents": [
        {
          "kind": "label",
          "text": "Math Operators"
        },
        {
          "kind": "block",
          "type": "mathexpression",
        },
        {
          "kind": "block",
          "type": "negative",
          "inputs": {
            "val": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "comparison",
          "inputs": {
            "lhs": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            },
            "rhs": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            },
          }
        },
        {
          "kind": "sep"
        },
        {
          "kind": "label",
          "text": "Logical Operations"
        },
        {
          "kind": "block",
          "type": "logicalexpression",
        },
        {
          "kind": "block",
          "type": "not"
        },
        {
          "kind": "block",
          "type": "true"
        },
        {
          "kind": "block",
          "type": "false"
        },
        {
          "kind": "sep"
        },
        {
          "kind": "label",
          "text": "Math Functions"
        },
        {
          "kind": "block",
          "type": "function",
          "inputs": {
            "val": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        },
        {
          "kind": "block",
          "type": "atan2",
          "inputs": {
            "first": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            },
            "second": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        }
      ]
    },
    {
      "kind": "category",
      "name": "Sensing",
      "categorystyle": "sensing",
      "contents": [
        {
          "kind": "label",
          "text": "Odometry"
        },
        {
          "kind": "block",
          "type": "xposition"
        },
        {
          "kind": "block",
          "type": "yposition"
        },
        {
          "kind": "block",
          "type": "heading"
        },
        {
          "kind": "block",
          "type": "distfrompoint"
        },
        {
          "kind": "sep"
        },
        {
          "kind": "label",
          "text": "Motor Data"
        },
        {
          "kind": "block",
          "type": "motorvoltage"
        },
        {
          "kind": "block",
          "type": "motorposition"
        },
        {
          "kind": "sep"
        },
        {
          "kind": "label",
          "text": "Controller"
        },
        {
          "kind": "block",
          "type": "controllerpress"
        }
      ]
    },
    {
      "kind": "category",
      "name": "Variables",
      "categorystyle": "variable",
      "contents": [
        {
          "kind": "button",
          "text": "Create Variable!",
          "callbackKey": "var_create"
        },
        {
          "kind": "block",
          "type": "getvar"
        },
        {
          "kind": "block",
          "type": "setvar",
          "inputs": {
            "val": {
              "shadow": {
                "type": "num",
                "fields": {
                  "num": 0
                }
              }
            }
          }
        }
      ]
    }
  ]
};

let workspace_data = {
  theme: {
    'blockStyles': {
      'event_block': {
        'colourPrimary': '#FFBF00',
        'colourSecondary': '#CC9900'
      },
      'motion_block': {
        'colourPrimary': '#4C97FF',
        'colourSecondary': '#3373CC'        
      },
      'time_block': {
        'colourPrimary': '#CF63CF',
        'colourSecondary': '#BD42BD'
      },
      'control_block': {
        'colourPrimary': '#FFAB19',
        'colourSecondary': '#CF8B17'
      },
      'operator_block': {
        'colourPrimary': '#59c059',
        'colourSecondary': '#389438'
      },
      'sensing_block': {
        'colourPrimary': '#5CB1D6',
        'colourSecondary': '#2E8EB8'
      },
      'variable_block': {
        'colourPrimary': '#FF8C1A',
        'colurSecondary': '#DB6E00'
      }
    },
    'categoryStyles': {
      'event': {
        'colour': '#FFBF00'
      },
      'motion': {
        'colour': '#4C97FF'
      },
      'time': {
        'colour': '#CF63CF'
      },
      'control': {
        'colour': '#FFAB19'
      },
      'operator': {
        'colour': '#59c059'
      },
      'sensing': {
        'colour': '#5CB1D6'
      },
      'variable': {
        'colour': '#FF8C1A'
      }
    },
    'startHats': true
  },
  toolbox: toolbox,
  scrollbars: {
    horizontal: false,
    vertical: true
  },
  maxTrashcanContents: 0,
  renderer: 'zelos'
};

const onresize = (e) => {
  let element = blocklyArea;
  let x = 0;
  let y = 0;
  do {
    x += element.offsetLeft;
    y += element.offsetTop;
    element = element.offsetParent;
  } while (element);
  blocklyDiv.style.left = x + 'px';
  blocklyDiv.style.top = y + 'px';
  blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
  blocklyDiv.style.height = blocklyArea.offsetHeight + 'px';
  if(workspace != undefined)
    Blockly.svgResize(workspace);
};

window.addEventListener('resize', onresize, false);
onresize();

const macro_select = (index) => {
  if(index == "new"){
    if(workspace == undefined)
      workspace = Blockly.inject('blocklyDiv', workspace_data);
    else{
      workspaces[curr_index] = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
      workspace.clear();
    }
    workspaces.push(JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
    curr_index = workspaces.length - 1;
    Blockly.serialization.workspaces.load(JSON.parse(workspaces[curr_index]), workspace);
    workspace.addChangeListener(Blockly.Events.disableOrphans);
  }
  else{
    if(workspace == undefined)
      workspace = Blockly.inject('blocklyDiv', workspace_data);
    workspaces[curr_index] = JSON.stringify(Blockly.serialization.workspaces.save(workspace));
    workspace.addChangeListener(Blockly.Events.disableOrphans);
    curr_index = index;
    Blockly.serialization.workspaces.load(JSON.parse(workspaces[index]), workspace);
  }
  macro_list.innerHTML = "";
  for(let i = 0; i < workspaces.length; i++){
    let temp = Blockly.inject('invisibleWorkspace', workspace_data);
    Blockly.serialization.workspaces.load(JSON.parse(workspaces[i]), temp);
    let id = get_macro_id(macroGenerator.workspaceToCode(temp));
    if(id == "")
      id = "&lt;unnamed&gt;";
    macro_list.innerHTML += `<a class="dropdown-item" id="${i}" onClick="macro_select(this.id)" href="#">${id}</a>`
  }
  macro_list.innerHTML += `<a class="dropdown-item" id="new" onClick="macro_select(this.id)" href="#"><i class="fa fa-plus"></i>New Macro</a>`
};

let get_indices = (s, search, reverse = false) => {
  let in_quotes = false;
  let parentheses_count = 0;
  let escape = false;
  let ret = [];
  if(!reverse){
      for(let i = 0; i < s.length; i++){
          if(s[i] == '\\' && !escape)
            escape = true;
          else
            escape = false;
          if(s[i] == '(')
            parentheses_count++;
          else if(s[i] == ')')
            parentheses_count--;
          if(s[i] == '"' && !escape)
            in_quotes = !in_quotes;
          for(let c of search)
            if(s[i] == c && !in_quotes && parentheses_count == 0)
              ret.push(i);
      }
  }
  else{
      for(let i = s.length - 1; i >= 0; i--){
        if(s[i] == ')')
          parentheses_count++;
        else if(s[i] == '(')
          parentheses_count--;
        if(s[i] == '"'){
          if(i > 0 && s[i-1] != '\\')
            in_quotes = !in_quotes;
        }
        for(let c of search)
          if(s[i] == c && !in_quotes && parentheses_count == 0)
            ret.push(i);
      }   
  }
  return ret;
}

const parse_expression = (w, expr) => {
  let block;
  let matches;
  if(expr.indexOf("EXPR(") == 0){
    expr = expr.substring("EXPR(".length, expr.lastIndexOf(')'));
    let last_index = 0;
    let indices = get_indices(expr, ['+', '-', '*', '/', '%', '^']);
    let operators = [];
    let operands = [];
    for(let index of indices){
      if(expr[index - 1] == ' ' && expr[index + 1] == ' '){
        operators.push(expr[index]);
        operands.push(expr.substring(last_index, index - 1).trim());
        last_index = index + 1;
      }
    }
    operands.push(expr.substring(last_index).trim());

    block = w.newBlock('mathexpression');
    block.updateShape_(operands.length);
    for(let i = 0; i < operators.length; i++)
      block.setFieldValue(operators[i], 'operator' + i);
    for(let i = 0; i < operands.length; i++)
      block.getInput('operand' + i).connection.connect(parse_expression(w, operands[i]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^ABS\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('abs', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^SIN\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('sin', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^COS\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('cos', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^TAN\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('tan', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^FLOOR\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('floor', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^CEIL\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('ceil', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^ROUND\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('function');
    block.setFieldValue('round', 'fn');
    block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^ATAN2\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('atan2');
    block.getInput('first').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('second').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
    return block;
  }
  else if((matches = expr.match(/^DISTANCE_FROM_POINT\((\d*\.?\d+), (\d*\.?\d+)\)/)) != null && matches.length > 1){
    block = w.newBlock('distfrompoint');
    block.setFieldValue(matches[1], 'x');
    block.setFieldValue(matches[2], 'y');
    block.initSvg();
    return block;
  }
  else if(expr.indexOf("CHASSIS_X()") == 0){
    block = w.newBlock('xposition');
    block.initSvg();
    return block;
  }
  else if(expr.indexOf("CHASSIS_Y()") == 0){
    block = w.newBlock('yposition');
    block.initSvg();
    return block;
  }
  else if(expr.indexOf("CHASSIS_HEADING()") == 0){
    block = w.newBlock('heading');
    block.initSvg();
    return block;
  }
  else if(expr.indexOf('TIME_SINCE_START()') == 0){
    block = w.newBlock('timesincestart');
    block.initSvg();
    return block;
  }
  else if(expr.indexOf('TIME_SINCE_EXECUTION()') == 0){
    block = w.newBlock('timesinceexecution');
    block.initSvg();
    return block;
  }
  else if(!isNaN(expr)){
    block = w.newBlock('num');
    block.setFieldValue(expr, 'num');
    block.setShadow(true);
    block.initSvg();
    return block;
  }
  else if(expr[0] == '-'){
    block = w.newBlock('negative');
    block.getInput('val').connection.connect(parse_expression(w, expr.substring(1)).outputConnection);
    block.initSvg();
    return block;
  }
  else
    return null;
};

let parse_statement = (w, conditional) => {
  let block = null;
  let matches;
  if(conditional.indexOf("GROUP(") == 0){
    conditional = conditional.substring("GROUP(".length, conditional.lastIndexOf(')'));
    let last_index = 0;
    let indices = get_indices(conditional, ['&', '|']);
    let operators = [];
    let operands = [];
    for(let index of indices){
      if(conditional[index - 1] == ' ' && conditional[index + 1] == ' '){
        operators.push(conditional[index]);
        operands.push(conditional.substring(last_index, index - 1).trim());
        last_index = index + 1;
      }
    }
    operands.push(conditional.substring(last_index).trim());

    block = w.newBlock('logicalexpression');
    block.updateShape_(operands.length);
    for(let i = 0; i < operators.length; i++)
      block.setFieldValue(operators[i], 'operator' + i);
    for(let i = 0; i < operands.length; i++)
      block.getInput('operand' + i).connection.connect(parse_statement(w, operands[i]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^LESS_THAN\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("lessthan", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^LESS_THAN_OR_EQUAL\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("lessthanorequal", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^GREATER_THAN\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("greaterthan", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^GREATER_THAN_OR_EQUAL\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("greaterthanorequal", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^EQUAL\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("equal", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^NOT_EQUAL\((.+), (.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('comparison');
    block.setFieldValue("notequal", "operator");
    block.getInput('lhs').connection.connect(parse_expression(w, matches[1]).outputConnection);
    block.getInput('rhs').connection.connect(parse_expression(w, matches[2]).outputConnection);
    block.initSvg();
  }
  else if((matches = conditional.match(/^NOT\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('not');
    block.getInput('val').connection.connect(parse_statement(w, matches[1]).outputConnection);
    block.initSvg();
  }
  else if(conditional.indexOf("TRUE()") == 0){
    block = w.newBlock('true');
    block.initSvg();
  }
  else if(conditional.indexOf("FALSE()") == 0){
    block = w.newBlock('false');
    block.initSvg();
  }
  else if((matches = conditional.match(/^CONTROLLER_PRESSED\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('controllerpress');
    block.setFieldValue(matches[1], 'button');
    block.initSvg();
  }
  return block;
}

let parse_macro_line = (w, line) => {
  let new_block = null;
  let matches;
  if(line.indexOf("TURN_TO(") == 0){
    new_block = w.newBlock('turn_to_point');
    matches = line.match(/^TURN_TO\((\d*\.?\d+), (\d*\.?\d+)\)/);
    new_block.setFieldValue(matches[1], "x");
    new_block.setFieldValue(matches[2], "y");
    new_block.initSvg();
  }
  else if(line.indexOf("TURN_TO_ASYNC(") == 0){
    new_block = w.newBlock('turn_to_point');
    matches = line.match(/^TURN_TO_ASYNC\((\d*\.?\d+), (\d*\.?\d+)\)/);
    new_block.setFieldValue(matches[1], "x");
    new_block.setFieldValue(matches[2], "y");
    new_block.updateShape_(true);
    new_block.initSvg();
  }
  else if(line.indexOf("DRIVE_TO(") == 0){
    new_block = w.newBlock('drive_to_point');
    matches = line.match(/^DRIVE_TO\((\d*\.?\d+), (\d*\.?\d+)\)/);
    new_block.setFieldValue(matches[1], "x");
    new_block.setFieldValue(matches[2], "y");
    new_block.initSvg();
  }
  else if(line.indexOf("DRIVE_TO_ASYNC(") == 0){
    new_block = w.newBlock('drive_to_point');
    matches = line.match(/^DRIVE_TO_ASYNC\((\d*\.?\d+), (\d*\.?\d+)\)/);
    new_block.setFieldValue(matches[1], "x");
    new_block.setFieldValue(matches[2], "y");
    new_block.updateShape_(true);
    new_block.initSvg();
  }
  else if((matches = line.match(/^MOVE_VOLTAGE\("(.+)", (.+)\)/)) != null && matches.length > 1){
    new_block = w.newBlock('movevoltage');
    new_block.setFieldValue(matches[1], "motorgroup");
    new_block.getInput('voltage').connection.connect(parse_expression(w, matches[2]).outputConnection);
    new_block.initSvg();
  }
  else if((matches = line.match(/^TIME_WAIT\((.+)\)/)) != null && matches.length > 1){
    new_block = w.newBlock('timewait');
    new_block.getInput('val').connection.connect(parse_expression(w, matches[1]).outputConnection);
    new_block.initSvg();
  }
  else if(line.indexOf("CHASSIS_WAIT()") == 0){
    new_block = w.newBlock('chassiswait');
    new_block.initSvg();
  }
  else if(line.indexOf("PP_WAIT()") == 0){
    new_block = w.newBlock('ppwait');
    new_block.initSvg();
  }
  return new_block;
}

const parse_conditional = (w, lines, index) => {
  let i = index;
  let block;
  let text = lines[i] + '\n';
  let brace_count = 0;
  i++;
  while(lines[i] != '}' || brace_count > 0){
    text += lines[i] + "\n";
    if(lines[i].slice(-1)[0] == '{')
      brace_count++;
    else if(lines[i] == '}')
      brace_count--;
    i++;
  }
  text += lines[i++] + '\n';
  while(i < lines.length && lines[i].indexOf("ELSEIF(") == 0){
    text += lines[i++] + '\n';
    while(lines[i] != '}' || brace_count > 0){
      text += lines[i] + "\n";
      if(lines[i].slice(-1)[0] == '{')
        brace_count++;
      else if(lines[i] == '}')
        brace_count--;
      i++;
    }
    text += lines[i++] + '\n';
  }
  if(i < lines.length && lines[i].indexOf("ELSE{") == 0){
    while(lines[i] != '}' || brace_count > 0){
      text += lines[i] + "\n";
      if(lines[i].slice(-1)[0] == '{')
        brace_count++;
      else if(lines[i] == '}')
        brace_count--;
      i++;
    }
    text += lines[i++] + '\n';
  }

  let matches;
  let new_lines = text.split('\n')
  console.log(new_lines);
  let else_if_count = 0;
  let curr_input;
  let statement_blocks = [];
  if((matches = new_lines[0].match(/^IF\((.+)\)/)) != null && matches.length > 1){
    block = w.newBlock('if');
    block.getInput('if').connection.connect(parse_statement(w, matches[1]).outputConnection);
    curr_input = block.getInput('if_body');
  }
  for(let i = 1; i < new_lines.length; i++){
    if(new_lines[i].indexOf("IF(") == 0){
      let block_and_index = parse_conditional(w, text.split('\n'), i);
      i = block_and_index[1];
      statement_blocks.push(block_and_index[0]);
    }
    else if((matches = new_lines[i].match(/^ELSEIF\((.+)\)/)) != null && matches.length > 1){
      for(let j = statement_blocks.length - 1; j > 0; j--)
        statement_blocks[j].previousConnection.connect(statement_blocks[j-1].nextConnection);
        if(statement_blocks.length > 0)
          curr_input.connection.connect(statement_blocks[0].previousConnection);
      statement_blocks = [];

      block.updateShape_(++else_if_count, false);
      block.getInput('elseif' + (else_if_count - 1)).connection.connect(parse_statement(w, matches[1]).outputConnection);
      curr_input = block.getInput('elseif_body' + (else_if_count - 1));
    }
    else if(new_lines[i].indexOf("ELSE{") == 0){
      for(let j = statement_blocks.length - 1; j > 0; j--)
        statement_blocks[j].previousConnection.connect(statement_blocks[j-1].nextConnection);
        if(statement_blocks.length > 0)
          curr_input.connection.connect(statement_blocks[0].previousConnection);
      statement_blocks = [];

      block.updateShape_(else_if_count, true);
      curr_input = block.getInput('else_body');
    }
    else if(new_lines[i].length > 0 && new_lines[i] != '}')
      statement_blocks.push(parse_macro_line(w, new_lines[i]));
  }
  for(let j = statement_blocks.length - 1; j > 0; j--)
    statement_blocks[j].previousConnection.connect(statement_blocks[j-1].nextConnection);
  if(statement_blocks.length > 0)
    curr_input.connection.connect(statement_blocks[0].previousConnection);
  statement_blocks = [];

  return [block, i - 1];
}

let parse_macros = (macros) => {
  let i = 0;
  let last_block;
  let matches;
  let lines = macros.split("\n");
  let w = Blockly.inject('invisibleWorkspace', workspace_data);
  while(i < lines.length - 1){
    while(lines[i].indexOf("MACRO_DEFINE(\"") != 0) i++;
    let last_block = w.newBlock('definemacro');
    let id = lines[i].substring(lines[i].indexOf("MACRO_DEFINE(\"") + "MACRO_DEFINE(\"".length, lines[i].lastIndexOf("\")"));
    last_block.setFieldValue(id, 'id');
    last_block.initSvg();
    i++;
    while(lines[i] != "MACRO_END"){
      if(lines[i].indexOf("IF(") == 0){
        let block_and_index = parse_conditional(w, lines, i);
        let block = block_and_index[0];
        last_block.nextConnection.connect(block.previousConnection);
        last_block = block;
        i = block_and_index[1];
      }
      else {
        let block = parse_macro_line(w, lines[i]);
        if(block){
          last_block.nextConnection.connect(block.previousConnection);
          last_block = block;
        }
        i++;
      }
    } 
    workspaces.push(JSON.stringify(Blockly.serialization.workspaces.save(w)));
    w = Blockly.inject('invisibleWorkspace', workspace_data);
  }
  macro_select(0);
}

parse_macros(`MACRO_DEFINE(\"TESTING\")
MOVE_VOLTAGE(\"default\", 0)
IF(LESS_THAN(6, 7)){
IF(GREATER_THAN(7, 8)){
MOVE_VOLTAGE(\"default\", 12000)
}
ELSEIF(EQUAL(10, 10)){
MOVE_VOLTAGE(\"default\", 6000)
}
ELSEIF(NOT_EQUAL(9, 10)){
TIME_WAIT(2000)
}
ELSE{
IF(GROUP(TRUE() & FALSE() | NOT(FALSE()))){
TIME_WAIT(3000)
}
ELSEIF(NOT_EQUAL(EXPR(9 * 10), EXPR(9 + 10))){
TIME_WAIT(EXPR(9 * 1000))
}
CHASSIS_WAIT()
}
PP_WAIT()
}
MOVE_VOLTAGE(\"default\", 0)
MACRO_END`);