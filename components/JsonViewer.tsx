
import React from 'react';

interface JsonViewerProps {
  data: object;
}

const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  return (
    <div className="bg-foundry-dark p-3 rounded-md text-sm text-foundry-text h-full overflow-auto">
      <pre>
        <code>
          {JSON.stringify(data, null, 2)}
        </code>
      </pre>
    </div>
  );
};

export default JsonViewer;
