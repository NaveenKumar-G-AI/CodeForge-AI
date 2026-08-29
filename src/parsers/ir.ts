export type NodeKind =
  | 'Program'
  | 'FunctionDecl'
  | 'ClassDecl'
  | 'Param'
  | 'Block'
  | 'If'
  | 'For'
  | 'While'
  | 'Try'
  | 'Catch'
  | 'With'
  | 'Return'
  | 'Throw'
  | 'Break'
  | 'Continue'
  | 'Call'
  | 'Assignment'
  | 'AugAssignment'
  | 'VariableDecl'
  | 'BinaryExpr'
  | 'BoolOp'
  | 'UnaryExpr'
  | 'Literal'
  | 'Identifier'
  | 'Import'
  | 'ImportName'
  | 'Comment'
  | 'ExpressionStmt';

export interface NormalizedNode {
  kind: NodeKind;
  name?: string;
  value?: string | number | boolean | null;
  operator?: string;
  children: NormalizedNode[];
  loc?: { startLine: number; endLine: number; startCol?: number; endCol?: number };
  meta?: Record<string, unknown>;
}

export interface ParsedModule {
  language: 'python' | 'javascript' | 'typescript';
  root: NormalizedNode;
  comments: NormalizedNode[];
  sourceLines: string[];
}

export function walk(
  node: NormalizedNode,
  visit: (n: NormalizedNode, parents: NormalizedNode[]) => void,
  parents: NormalizedNode[] = [],
  stopDescend?: (n: NormalizedNode) => boolean
): void {
  visit(node, parents);
  if (stopDescend && stopDescend(node)) return;
  const nextParents = [...parents, node];
  for (const child of node.children) {
    walk(child, visit, nextParents, stopDescend);
  }
}

export function findAll(root: NormalizedNode, kind: NodeKind): NormalizedNode[] {
  const results: NormalizedNode[] = [];
  walk(root, (n) => {
    if (n.kind === kind) results.push(n);
  });
  return results;
}
