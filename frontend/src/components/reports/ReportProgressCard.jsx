import { useState, useEffect } from "react";
import { Card, Progress, Collapse, Tag, Descriptions, Typography, Space } from "antd";
import {
  DatabaseOutlined,
  CalculatorOutlined,
  RobotOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";

const { Panel } = Collapse;
const { Text, Paragraph } = Typography;

export default function ReportProgressCard({ progressEvents = [] }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [expandedStep, setExpandedStep] = useState(null);

  useEffect(() => {
    if (progressEvents.length > 0) {
      const latest = progressEvents[progressEvents.length - 1];
      setCurrentStep(latest.step || 0);
      
      // Auto-expand current step
      if (latest.step_name !== "COMPLETED" && latest.step_name !== "ERROR") {
        setExpandedStep(latest.step);
      }
    }
  }, [progressEvents]);

  const getStepIcon = (stepName) => {
    switch (stepName) {
      case "COLLECTING_DATA":
        return <DatabaseOutlined style={{ color: "#1890ff" }} />;
      case "CALCULATING":
        return <CalculatorOutlined style={{ color: "#52c41a" }} />;
      case "AI_ANALYZING":
        return <RobotOutlined style={{ color: "#722ed1" }} />;
      case "GENERATING_HTML":
        return <FileTextOutlined style={{ color: "#fa8c16" }} />;
      case "COMPLETED":
        return <CheckCircleOutlined style={{ color: "#52c41a" }} />;
      default:
        return null;
    }
  };

  const getStepColor = (stepName) => {
    switch (stepName) {
      case "COLLECTING_DATA":
        return "blue";
      case "CALCULATING":
        return "green";
      case "AI_ANALYZING":
        return "purple";
      case "GENERATING_HTML":
        return "orange";
      case "COMPLETED":
        return "success";
      default:
        return "default";
    }
  };

  const getStepTitle = (stepName) => {
    switch (stepName) {
      case "COLLECTING_DATA":
        return "Bước 1: Thu thập dữ liệu";
      case "CALCULATING":
        return "Bước 2: Tính toán số liệu";
      case "AI_ANALYZING":
        return "Bước 3: AI Phân tích";
      case "GENERATING_HTML":
        return "Bước 4: Tạo báo cáo HTML";
      case "COMPLETED":
        return "Bước 5: Hoàn thành";
      default:
        return stepName;
    }
  };

  const renderStepDetails = (event) => {
    const { step_name, details } = event;

    if (step_name === "COLLECTING_DATA") {
      const dataSources = details.data_sources || [];
      return (
        <div className="space-y-3">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Tổng số items">
              {details.total_items || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Số nguồn dữ liệu">
              {details.sources_count || 0}
            </Descriptions.Item>
          </Descriptions>
          
          {dataSources.length > 0 && (
            <div className="mt-3">
              <Text strong>Nguồn dữ liệu:</Text>
              <div className="mt-2 space-y-2">
                {dataSources.map((source, idx) => (
                  <Card key={idx} size="small" className="bg-blue-50">
                    <Space direction="vertical" size="small" className="w-full">
                      <div>
                        <Text strong>{source.name}</Text>
                      </div>
                      <div>
                        <Text type="secondary" className="text-xs">
                          📊 {source.source}
                        </Text>
                      </div>
                      <div>
                        <Tag color="blue">{source.count} items</Tag>
                        <Text className="text-xs ml-2">{source.description}</Text>
                      </div>
                    </Space>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step_name === "CALCULATING") {
      const calculations = details.calculations || [];
      const formulas = details.formulas || [];
      
      return (
        <div className="space-y-3">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Số phép tính">
              {details.calculations_count || 0}
            </Descriptions.Item>
          </Descriptions>
          
          {calculations.length > 0 && (
            <div className="mt-3">
              <Text strong>Chi tiết tính toán:</Text>
              <div className="mt-2 space-y-2">
                {calculations.map((calc, idx) => (
                  <Card key={idx} size="small" className="bg-green-50">
                    <Space direction="vertical" size="small" className="w-full">
                      <div>
                        <Text strong>{calc.name}</Text>
                        <Text type="secondary" className="text-xs block">
                          {calc.description}
                        </Text>
                      </div>
                      <div className="mt-2">
                        <Text className="text-xs" type="secondary">Input:</Text>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(calc.inputs, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <Text className="text-xs" type="secondary">Output:</Text>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(calc.outputs, null, 2)}
                        </pre>
                      </div>
                    </Space>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {formulas.length > 0 && (
            <div className="mt-3">
              <Text strong>Công thức:</Text>
              <ul className="mt-2 space-y-1">
                {formulas.map((formula, idx) => (
                  <li key={idx} className="text-sm font-mono bg-gray-50 p-2 rounded">
                    {formula}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (step_name === "AI_ANALYZING") {
      return (
        <div className="space-y-3">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Model AI">
              {details.model || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Thời gian xử lý">
              {details.processing_time
                ? `${(details.processing_time * 1000).toFixed(0)}ms`
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Số insights">
              {details.insights_count || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Số recommendations">
              {details.recommendations_count || 0}
            </Descriptions.Item>
          </Descriptions>
          
          {details.prompt_preview && (
            <div className="mt-3">
              <Text strong>Prompt preview:</Text>
              <Paragraph
                ellipsis={{ rows: 3, expandable: true }}
                className="text-xs bg-gray-50 p-2 rounded mt-1"
              >
                {details.prompt_preview}
              </Paragraph>
            </div>
          )}
          
          {details.data_summary && (
            <div className="mt-3">
              <Text strong>Data summary gửi cho AI:</Text>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto max-h-40">
                {JSON.stringify(details.data_summary, null, 2)}
              </pre>
            </div>
          )}
        </div>
      );
    }

    if (step_name === "GENERATING_HTML") {
      return (
        <div className="space-y-3">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Template">
              {details.template_name || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Số biểu đồ">
              {details.charts_count || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Số metrics">
              {details.metrics_count || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng components">
              {details.total_components || 0}
            </Descriptions.Item>
          </Descriptions>
          
          {details.components && details.components.length > 0 && (
            <div className="mt-3">
              <Text strong>Components:</Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {details.components.map((comp, idx) => (
                  <Tag key={idx} color="orange">
                    {comp}
                  </Tag>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step_name === "COMPLETED") {
      return (
        <div className="space-y-3">
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Report ID">
              {details.report_id || "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="File size">
              {details.file_size_mb
                ? `${details.file_size_mb} MB`
                : details.file_size
                ? `${(details.file_size / 1024).toFixed(2)} KB`
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng thời gian">
              {details.total_time
                ? `${(details.total_time * 1000).toFixed(0)}ms`
                : "N/A"}
            </Descriptions.Item>
            <Descriptions.Item label="Tổng số steps">
              {details.total_steps || 0}
            </Descriptions.Item>
          </Descriptions>
          
          {details.report_url && (
            <div className="mt-3">
              <a
                href={details.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                Xem báo cáo →
              </a>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  if (progressEvents.length === 0) {
    return (
      <Card className="mb-4">
        <Text type="secondary">Chưa có progress data</Text>
      </Card>
    );
  }

  const latestEvent = progressEvents[progressEvents.length - 1];
  const percentage = latestEvent.percentage || 0;

  return (
    <Card
      title={
        <Space>
          {getStepIcon(latestEvent.step_name)}
          <span>Quy trình AI Phân tích</span>
        </Space>
      }
      className="mb-4"
      extra={
        <Tag color={getStepColor(latestEvent.step_name)}>
          {percentage}%
        </Tag>
      }
    >
      <Progress
        percent={percentage}
        status={latestEvent.step_name === "COMPLETED" ? "success" : "active"}
        strokeColor={{
          "0%": "#108ee9",
          "100%": "#87d068",
        }}
        className="mb-4"
      />

      <Collapse
        activeKey={expandedStep !== null ? [expandedStep] : []}
        onChange={(keys) => setExpandedStep(keys.length > 0 ? keys[0] : null)}
        ghost
      >
        {progressEvents.map((event, idx) => (
          <Panel
            key={event.step}
            header={
              <Space>
                {getStepIcon(event.step_name)}
                <span>{getStepTitle(event.step_name)}</span>
                <Tag color={getStepColor(event.step_name)}>
                  {event.percentage}%
                </Tag>
              </Space>
            }
            extra={
              expandedStep === event.step ? (
                <UpOutlined />
              ) : (
                <DownOutlined />
              )
            }
          >
            <div className="mt-2">
              <Text type="secondary" className="block mb-2">
                {event.message}
              </Text>
              {renderStepDetails(event)}
            </div>
          </Panel>
        ))}
      </Collapse>
    </Card>
  );
}

