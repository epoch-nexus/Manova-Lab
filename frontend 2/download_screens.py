import json
import urllib.request
import os
import re

# Data from list_screens
data = {
    "screens": [
        {
            "name": "dashboard",
            "title": "Manova Labs - Researcher Dashboard",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlNDZkMjA4MjEwNzNhZmI1YTNjMDUxY2JjEgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        },
        {
            "name": "landing",
            "title": "Manova Labs - SaaS Landing Page",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlMjlmNzgzM2EwMzM4NTlhMTMwMmNiZjM5EgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        },
        {
            "name": "runner",
            "title": "Manova Labs - Participant Experiment Runner",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlNGJiZmZhZmYwMzkyZDFjNDQwMjNiYzg0EgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        },
        {
            "name": "builder",
            "title": "Manova Labs - Visual Experiment Builder",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlN2YxMjA2ZTQwNWMyYzA4OWE3M2FjNGVhEgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        },
        {
            "name": "results",
            "title": "Manova Labs - Results Dashboard",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlNTZiNjkzNmIwNzc5OWQ1YzAwMjQzMDE4EgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        },
        {
            "name": "auth",
            "title": "Manova Labs - Authentication & Access Portal",
            "downloadUrl": "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzAwMDY1YzVlM2U1YzVmMjcwNWMyZmYzYWEyMDJjODViEgsSBxCUpLe95R4YAZIBIwoKcHJvamVjdF9pZBIVQhM3MTQxNDkxOTg2NzQ3Njg3NjE1&filename=&opi=89354086"
        }
    ]
}

def convert_html_to_jsx(html):
    # Extract body content
    body_match = re.search(r'<body[^>]*>(.*?)</body>', html, re.DOTALL | re.IGNORECASE)
    if body_match:
        html = body_match.group(1)
    
    # Replace class with className
    html = re.sub(r'\bclass=', 'className=', html)
    # Replace for with htmlFor
    html = re.sub(r'\bfor=', 'htmlFor=', html)
    
    # Simple self-closing tags fix (img, input, hr, br, etc)
    html = re.sub(r'<(img|input|hr|br|meta|link)([^>]*?)(?<!/)>', r'<\1\2 />', html)
    # Remove inline comments as they can break JSX
    html = re.sub(r'<!--(.*?)-->', '', html, flags=re.DOTALL)
    
    # Fix inline styles (very hacky, just converting style="..." to style={{...}})
    def style_replacer(match):
        style_str = match.group(1)
        styles = style_str.split(';')
        style_obj = []
        for s in styles:
            if ':' in s:
                k, v = s.split(':', 1)
                k = k.strip()
                v = v.strip()
                # camelCase key
                parts = k.split('-')
                k = parts[0] + ''.join(p.capitalize() for p in parts[1:])
                style_obj.append(f"'{k}': '{v}'")
        return 'style={{' + ', '.join(style_obj) + '}}'
    
    html = re.sub(r'style="([^"]*)"', style_replacer, html)
    
    return html

os.makedirs('src/pages', exist_ok=True)

for screen in data['screens']:
    print(f"Downloading {screen['name']}...")
    req = urllib.request.Request(screen['downloadUrl'], headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        html = response.read().decode('utf-8')
        
    jsx_content = convert_html_to_jsx(html)
    
    component_name = ''.join(word.capitalize() for word in screen['name'].split('_')) + 'Page'
    
    react_code = f"""import React from 'react';

export default function {component_name}() {{
    return (
        <>
            {jsx_content}
        </>
    );
}}
"""
    with open(f"src/pages/{component_name}.jsx", "w", encoding='utf-8') as f:
        f.write(react_code)
        
print("Done!")
