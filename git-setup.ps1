# Git setup script for ErrandBit

# Configure Git user (update with your details if needed)
git config user.name "MWANGAZA-LAB"
git config user.email "dev@mwangaza.com"

# Create initial commit
git commit -m "Initial commit - ErrandBit MVP scaffold"

# Add remote repository
git remote add origin https://github.com/MWANGAZA-LAB/ErrandBit.git

# Rename branch to main
git branch -M main

# Push to GitHub
git push -u origin main

Write-Host "Repository pushed to GitHub successfully!" -ForegroundColor Green
