import Link from "next/link";
import { ImportUploadPanel } from "@/components/ImportUploadPanel";
import { getImportTemplates, importTypes, type ImportType } from "@/server/imports";

type ImportsPageProps = {
  searchParams?: Promise<{ type?: string | string[] }>;
};

function resolveInitialImportType(value: string | string[] | undefined): ImportType | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return importTypes.includes(candidate as ImportType) ? candidate as ImportType : undefined;
}

export default async function ImportsPage({ searchParams }: ImportsPageProps) {
  const templates = getImportTemplates();
  const params = await searchParams;
  const initialImportType = resolveInitialImportType(params?.type);

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">试运行数据导入</h1>
          <p className="page-subtitle">
            先下载标准模板，填写后上传文件预览校验；没有错误行时，才能整批提交入库。
          </p>
        </div>
        <span className="badge green">标准模板导入</span>
      </header>

      <ImportUploadPanel templates={templates} initialImportType={initialImportType} />

      <section className="template-grid">
        {templates.map((template) => (
          <article className="panel" key={template.importType}>
            <div className="panel-head">
              <h2>{template.label}</h2>
              <span className="badge blue">{template.importType}</span>
            </div>
            <div className="panel-body">
              <p className="muted-text">{template.description}</p>
              <div className="template-actions">
                <Link className="button-link" href={`/api/commission/imports/templates?type=${template.importType}&format=xlsx`}>
                  下载 xlsx
                </Link>
                <Link className="button-link secondary" href={`/api/commission/imports/templates?type=${template.importType}&format=csv`}>
                  下载 csv
                </Link>
              </div>
              <div className="column-list">
                {template.columns.map((column) => (
                  <span key={column}>{column}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>导入流程</h2>
          <span className="badge amber">预览通过后提交</span>
        </div>
        <div className="panel-body">
          <ol className="workflow-list">
            <li>下载对应业务模板，按中文列名填写，保持表头不变。</li>
            <li>在上方选择导入类型和文件，点击“上传并预览”。</li>
            <li>系统逐行检查必填、金额、日期、周期、员工、车辆和订单依赖。</li>
            <li>修正所有错误后重新上传；任意错误行存在时，不允许提交入库。</li>
            <li>预览通过后点击“确认提交入库”，系统会保留导入批次、行号、原始数据和错误原因。</li>
          </ol>
        </div>
      </section>
    </>
  );
}
