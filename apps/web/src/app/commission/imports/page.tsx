import Link from "next/link";
import { getImportTemplates } from "@/server/imports";

export default function ImportsPage() {
  const templates = getImportTemplates();

  return (
    <>
      <header className="page-head">
        <div>
          <h1 className="page-title">试运行数据导入</h1>
          <p className="page-subtitle">
            先下载标准模板，上传后系统预览并逐行校验；没有错误行时才能整批提交。
          </p>
        </div>
        <span className="badge green">标准模板导入</span>
      </header>

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
            <li>下载对应业务模板，按中文列名填写。</li>
            <li>上传文件到预览接口，系统检查必填、金额、日期、周期、员工、车辆和订单依赖。</li>
            <li>逐行修正错误后重新上传；任意错误行存在时不允许提交。</li>
            <li>提交时按整批原子化写入，并保留导入批次、行号、原始数据和错误原因。</li>
          </ol>
        </div>
      </section>
    </>
  );
}
