
# Architecture & Design Rationale

## System Architecture Overview

text
[ Mock BSE API (Port 5000) ]
        |
        | (Background Worker / Sync Job with Retries)
        v
[ Internal Node.js Backend (Port 4000) ] <---> [ MySQL Database (arham_db) ]
        |
        | (REST API + Server-Sent Events)
        v
[ React + Vite Dashboard (Port 5173) ]