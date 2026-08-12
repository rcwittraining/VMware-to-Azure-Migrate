# AZ-MIG-201 · Azure Migrate lab simulator

Interactive, browser-based lab that walks through an **end-to-end VMware vCenter → Azure** migration with Azure Migrate (agentless).

You will:

1. Sign in to a simulated Azure portal  
2. Create the Azure Migrate project and resource group  
3. Generate a project key and download the appliance OVA  
4. Deploy the OVA in a simulated vSphere Client  
5. Register the appliance (prereqs, key, device login, VDDK)  
6. Connect vCenter and run continuous discovery  
7. Assess Wave 1 VMs  
8. Replicate **WEB-01**, test-migrate, then planned cutover  

No Azure subscription or vCenter is required.

## Run

Open `index.html` in a browser, or from this folder:

```bash
python3 -m http.server 8080
```

Then browse to the printed URL.

- **Simulator:** `/` or `index.html`  
- **Student / instructor guide:** `lab-guide.html`

## Lab credentials (also shown on the briefing screen)

| System | User | Password |
| --- | --- | --- |
| Azure | admin@contoso.com | Contoso@Azure2026 |
| vCenter | migrate-svc@vsphere.local | VMware@123 |

Required names: project `contoso-vmware-migrate`, RG `rg-migrate-prod`, appliance `contosoappl01`, VM `AzureMigrateAppl`.

## Notes

This is a training simulator. UI copy follows Microsoft Learn (Azure Migrate project, OVA appliance, Configuration Manager on TCP 44368, agentless CBT + VDDK, test vs planned migration) but it does not call Azure APIs.
