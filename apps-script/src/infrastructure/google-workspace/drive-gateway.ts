export interface DriveGatewayDependencies {
  driveApp: {
    createFolder(name: string): DriveFolderLike;
  };
}

export interface CreateTenantFoldersRequest {
  businessName: string;
}

export interface FolderManifest {
  id: string;
  name: string;
}

export interface DatabaseFolderManifest extends FolderManifest {
  children: readonly FolderManifest[];
}

export interface TenantFolderManifest {
  root: FolderManifest;
  database: DatabaseFolderManifest;
  attachments: FolderManifest;
  backups: FolderManifest;
  exports: FolderManifest;
  archive: FolderManifest;
  templates: FolderManifest;
  generatedDocuments: FolderManifest;
}

export interface DriveGateway {
  createTenantFolders(request: CreateTenantFoldersRequest): TenantFolderManifest;
}

interface DriveFolderLike {
  createFolder(name: string): DriveFolderLike;
  getId(): string;
  getName(): string;
}

export function createDriveGateway(deps: DriveGatewayDependencies): DriveGateway {
  return {
    createTenantFolders(request) {
      const root = deps.driveApp.createFolder(`Sales Management - ${request.businessName}`);
      const database = root.createFolder('Database');
      const databaseChildren = [
        database.createFolder('Core Data'),
        database.createFolder('Runtime Data'),
        database.createFolder('Transaction Data'),
        database.createFolder('Audit Data'),
      ].map(toFolderManifest);

      return {
        root: toFolderManifest(root),
        database: {
          ...toFolderManifest(database),
          children: databaseChildren,
        },
        attachments: toFolderManifest(root.createFolder('Attachments')),
        backups: toFolderManifest(root.createFolder('Backups')),
        exports: toFolderManifest(root.createFolder('Exports')),
        archive: toFolderManifest(root.createFolder('Archive')),
        templates: toFolderManifest(root.createFolder('Templates')),
        generatedDocuments: toFolderManifest(root.createFolder('Generated Documents')),
      };
    },
  };
}

function toFolderManifest(folder: DriveFolderLike): FolderManifest {
  return {
    id: folder.getId(),
    name: folder.getName(),
  };
}
