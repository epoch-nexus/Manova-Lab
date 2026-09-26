import os
import re

directory = 'src/pages'
for filename in os.listdir(directory):
    if filename.endswith('.jsx'):
        filepath = os.path.join(directory, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Strip out script tags and their contents
        content = re.sub(r'<script.*?>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)
        
        # Also clean up some curly braces causing issues (like raw inline JSON or object parsing in text)
        # To avoid this, we can just let React handle most of it, but `<script>` was the main issue.
        # But wait, looking at BuilderPage.jsx:486, it was probably inside a `<script>`!
        # Because we saw "node_id": "stim_target_03" which looks like JSON inside script.
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
            
print("Stripped scripts")
